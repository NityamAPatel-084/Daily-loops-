import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../App.css';
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  Trophy,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  Activity,
  FileText,
  Video,
  Folder,
  Plus,
  Trash2,
  Trash,
  Edit2,
  PlusCircle,
  X,
  MapPin,
  CalendarDays,
  LogOut
} from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths, isSameDay, parseISO } from 'date-fns';

// --- MOCK DATA ---
const initialCourses = [
  {
    id: 1,
    title: "SAP ABAP Core Programming",
    organization: "SAP Learning",
    status: "active",
    progress: 75,
    deadline: "2026-04-15",
    tasks: ["Complete Module 4 Assessment", "Review syntax changes in ABAP OO"],
    description: "Core ABAP programming principles. High priority due to tight deadline.",
  },
  {
    id: 2,
    title: "SAP Fiori / UI5 Development",
    organization: "SAP Learning",
    status: "pending",
    progress: 30,
    deadline: "2026-04-20",
    tasks: ["Set up local UI5 runtime", "Complete the initial setup video"],
    description: "Developing modern UX for SAP applications.",
  }
];

const initialInternships = [
  {
    id: 1,
    title: "AI Strategist and Business Intelligence",
    organization: "IBM Skillsbuild",
    status: "active",
    progress: 60,
    deadline: "Weekly",
    notes: '',
    tasks: [
      { text: "Attend Weekly Masterclass (Friday 5 PM)", completed: false },
      { text: "Submit Google Form for Attendance", completed: false },
      { text: "Complete Learning Course Modules", completed: false },
      { text: "Upload Prior Completion Certificate", completed: false }
    ]
  },
  {
    id: 2,
    title: "AI/ML Track Intern",
    organization: "IBM Skillsbuild",
    status: "active",
    progress: 45,
    deadline: "Weekly",
    notes: '',
    tasks: [
      { text: "Attend Weekly Masterclass", completed: false },
      { text: "Complete Model Building Assignment", completed: false },
      { text: "Submit Attendance Form", completed: false }
    ]
  },
  {
    id: 3,
    title: "Chatbot Development",
    organization: "IBM Skillsbuild",
    status: "pending",
    progress: 10,
    deadline: "Weekly",
    notes: '',
    tasks: [
      { text: "Introductory Masterclass", completed: false },
      { text: "Explore Watson Assistant docs", completed: false }
    ]
  }
];

const initialHackathons = [
  {
    id: 1,
    title: "Robofest 5.0 - Grand Finale",
    organization: "Robofest Org",
    status: "active",
    date: "2026-05-10",
    teamSize: 4,
    description: "Grand Finale round. Need to prepare physical robot prototype and integration code.",
    links: [
      { label: "Registration Form", url: "" },
      { label: "Rulebook PDF", url: "" },
      { label: "Submission Portal", url: "" }
    ],
    tasks: [],
    notes: ''
  },
  {
    id: 2,
    title: "Smart India Hackathon (SIH) 2025",
    organization: "MoE, Govt. of India",
    status: "active",
    date: "2026-06-01",
    teamSize: 6,
    description: "Grand Finale stage. Working on Problem Statement #1042 - Hardware prototype pending.",
    links: [
      { label: "Nodal Center Form", url: "" },
      { label: "Rules & Guidelines", url: "" }
    ],
    tasks: [],
    notes: ''
  },
  {
    id: 3,
    title: "Odoo Online Hackathon",
    organization: "Odoo",
    status: "pending",
    date: "2026-04-30",
    teamSize: 2,
    description: "Building ERP modules using Python/XML. Participating in the online phase.",
    links: [
      { label: "Odoo Dev Docs", url: "" },
      { label: "Submission Link", url: "" }
    ],
    tasks: [],
    notes: ''
  }
];

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const sanitizeForFirestore = (value) => {
  if (value === null || value === undefined) return value;

  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }

  if (value instanceof Date) return value.toISOString();

  if (!isPlainObject(value)) return undefined;

  // Skip React elements and other non-serializable objects.
  if (Object.prototype.hasOwnProperty.call(value, '$$typeof')) return undefined;

  const sanitized = {};
  Object.entries(value).forEach(([key, nestedValue]) => {
    const cleanedValue = sanitizeForFirestore(nestedValue);
    if (cleanedValue !== undefined) sanitized[key] = cleanedValue;
  });

  return sanitized;
};

const buildPersistedDashboardState = ({
  activeTab,
  theme,
  tabLinks,
  customSections,
  customTasks,
  customProjects,
  courses,
  internships,
  hackathons,
  calendarEvents
}) => {
  return sanitizeForFirestore({
    activeTab,
    theme,
    tabLinks,
    customSections,
    customTasks,
    customProjects,
    courses,
    internships,
    hackathons,
    calendarEvents
  });
};

// --- COMPONENT ---
export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('deep-focus');
  const [tabLinks, setTabLinks] = useState({});

  // Custom Sections State
  const [customSections, setCustomSections] = useState([
    { id: 'personal-project', label: 'Personal Project', isCustom: true },
    { id: 'workshop', label: 'Workshop', isCustom: true },
    { id: 'others', label: 'Others', isCustom: true }
  ]);
  const [customTasks, setCustomTasks] = useState({
    'personal-project': [
      { id: 1, text: 'Phase 1: Planning and Wireframing', completed: true },
      { id: 2, text: 'Phase 2: Database Design', completed: false }
    ],
    'workshop': [
      { id: 1, text: 'Prepare workshop materials', completed: false },
      { id: 2, text: 'Set up presentation slides', completed: false },
      { id: 3, text: 'Arrange equipment and resources', completed: false }
    ],
    'others': []
  });

  // Custom projects per section (card grid)
  const [customProjects, setCustomProjects] = useState({
    'personal-project': [
      {
        id: 1, title: 'My First Project', description: 'A personal dev project', date: '', status: 'active', tasks: [
          { text: 'Phase 1: Planning and Wireframing', completed: true },
          { text: 'Phase 2: Database Design', completed: false }
        ], notes: '', links: []
      }
    ],
    'workshop': [],
    'others': []
  });

  // Track standard lists in state
  const [courses, setCourses] = useState(initialCourses);
  const [internships, setInternships] = useState(initialInternships);
  const [hackathons, setHackathons] = useState(initialHackathons);

  const [calendarEvents, setCalendarEvents] = useState([
    { id: 1, date: '2026-05-10', title: 'Robofest 5.0 Finale', type: 'hackathon' },
    { id: 2, date: '2026-04-15', title: 'ABAP Core Assessment', type: 'course' },
  ]);

  // Modal State
  const [modalConfig, setModalConfig] = useState(null); // null means closed
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Custom Section Task Input State
  const [newTaskText, setNewTaskText] = useState('');

  const hasHydratedFromCloudRef = useRef(false);
  const applyingCloudSnapshotRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const dashboardDocRef = doc(db, 'users', currentUser.uid, 'dashboard', 'main');

    const unsubscribe = onSnapshot(
      dashboardDocRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          hasHydratedFromCloudRef.current = true;
          return;
        }

        const cloudState = snapshot.data()?.state;
        if (!cloudState) {
          hasHydratedFromCloudRef.current = true;
          return;
        }

        applyingCloudSnapshotRef.current = true;

        if (typeof cloudState.activeTab === 'string') setActiveTab(cloudState.activeTab);
        if (typeof cloudState.theme === 'string') setTheme(cloudState.theme);
        if (cloudState.tabLinks && isPlainObject(cloudState.tabLinks)) setTabLinks(cloudState.tabLinks);
        if (Array.isArray(cloudState.customSections)) setCustomSections(cloudState.customSections);
        if (cloudState.customTasks && isPlainObject(cloudState.customTasks)) setCustomTasks(cloudState.customTasks);
        if (cloudState.customProjects && isPlainObject(cloudState.customProjects)) setCustomProjects(cloudState.customProjects);
        if (Array.isArray(cloudState.courses)) setCourses(cloudState.courses);
        if (Array.isArray(cloudState.internships)) setInternships(cloudState.internships);
        if (Array.isArray(cloudState.hackathons)) setHackathons(cloudState.hackathons);
        if (Array.isArray(cloudState.calendarEvents)) setCalendarEvents(cloudState.calendarEvents);

        hasHydratedFromCloudRef.current = true;
        setTimeout(() => {
          applyingCloudSnapshotRef.current = false;
        }, 0);
      },
      (error) => {
        console.error('Failed to sync dashboard data:', error);
        hasHydratedFromCloudRef.current = true;
      }
    );

    return () => {
      unsubscribe();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    if (!hasHydratedFromCloudRef.current) return;
    if (applyingCloudSnapshotRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    const dashboardDocRef = doc(db, 'users', currentUser.uid, 'dashboard', 'main');
    const persistedState = buildPersistedDashboardState({
      activeTab,
      theme,
      tabLinks,
      customSections,
      customTasks,
      customProjects,
      courses,
      internships,
      hackathons,
      calendarEvents
    });

    saveTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(
          dashboardDocRef,
          {
            state: persistedState,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (error) {
        console.error('Failed to save dashboard data:', error);
      }
    }, 450);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    currentUser?.uid,
    activeTab,
    theme,
    tabLinks,
    customSections,
    customTasks,
    customProjects,
    courses,
    internships,
    hackathons,
    calendarEvents
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const coreNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'SAP Courses', icon: BookOpen },
    { id: 'internships', label: 'Internships', icon: Briefcase },
    { id: 'hackathons', label: 'Hackathons', icon: Trophy },
  ];

  const navItems = [...coreNavItems, ...customSections, { id: 'calendar', label: 'Calendar', icon: Calendar }];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      console.error('Failed to log out');
    }
  };

  const openModal = (type, data = null, extraConfig = {}) => {
    setModalConfig({ type, data, ...extraConfig });
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const date = formData.get('date');
    const description = formData.get('description');
    const organization = formData.get('organization') || 'Custom';

    const newEntry = {
      id: modalConfig.data?.id || Date.now(),
      title, date, deadline: date, description, organization,
      status: 'pending', progress: 0, tasks: [], teamSize: 1, links: []
    };

    if (modalConfig.type === 'ADD_COURSE') setCourses([...courses, newEntry]);
    if (modalConfig.type === 'ADD_INTERNSHIP') setInternships([...internships, newEntry]);
    if (modalConfig.type === 'ADD_HACKATHON') setHackathons([...hackathons, newEntry]);
    if (modalConfig.type === 'ADD_CALENDAR') setCalendarEvents([...calendarEvents, { id: Date.now(), title, date, type: 'general' }]);

    if (modalConfig.type === 'ADD_PROJECT') {
      // Add a new project card inside the CURRENT active section (or create a new section)
      const isNewSection = !customSections.find(s => s.id === activeTab);
      if (isNewSection) {
        // If we pressed "Add New Project" from sidebar — create a new section
        const newId = title.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        setCustomSections([...customSections, { id: newId, label: title, isCustom: true }]);
        setCustomProjects(prev => ({ ...prev, [newId]: [] }));
        setCustomTasks(prev => ({ ...prev, [newId]: [] }));
        setActiveTab(newId);
      } else {
        // Add a new project card inside the active section
        const projectCard = {
          id: Date.now(),
          title,
          description: description || '',
          date: date || '',
          status: 'active',
          tasks: [],
          notes: '',
          links: []
        };
        setCustomProjects(prev => ({
          ...prev,
          [activeTab]: [...(prev[activeTab] || []), projectCard]
        }));
      }
    }

    if (modalConfig.type === 'EDIT_PROJECT_CARD') {
      const { sectionId, projectId } = modalConfig;
      setCustomProjects(prev => ({
        ...prev,
        [sectionId]: (prev[sectionId] || []).map(p => p.id === projectId ? { ...p, title, description: description || p.description, date: date || p.date } : p)
      }));
    }

    if (modalConfig.type === 'QUICK_ADD_TASK') {
      const sectionId = modalConfig.data.id;
      const taskText = formData.get('title');
      const priority = formData.get('priority') || 'medium';
      const dueDate = formData.get('dueDate') || '';
      const notes = formData.get('notes') || '';
      const tags = formData.get('tags') || '';
      const status = formData.get('status') || 'pending';

      const taskData = {
        id: Date.now(),
        text: taskText,
        priority,
        dueDate,
        notes,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        status,
        completed: status === 'completed'
      };

      // Handle custom sections
      if (customSections.find(s => s.id === sectionId)) {
        setCustomTasks(prev => ({
          ...prev,
          [sectionId]: [...(prev[sectionId] || []), taskData]
        }));
      }
      // Handle core categories
      else if (sectionId === 'courses') {
        // Add task to the first course as a general task
        setCourses(prev => prev.map((course, index) =>
          index === 0 ? { ...course, tasks: [...course.tasks, `${taskText}${priority !== 'medium' ? ` (${priority})` : ''}${dueDate ? ` - Due: ${dueDate}` : ''}`] } : course
        ));
      }
      else if (sectionId === 'internships') {
        // Add task to the first internship as a general task
        setInternships(prev => prev.map((internship, index) =>
          index === 0 ? { ...internship, tasks: [...internship.tasks, { text: `${taskText}${priority !== 'medium' ? ` (${priority})` : ''}${dueDate ? ` - Due: ${dueDate}` : ''}`, icon: <CheckCircle2 size={16} /> }] } : internship
        ));
      }
      else if (sectionId === 'hackathons') {
        // Add task as a note/link to the first hackathon
        setHackathons(prev => prev.map((hackathon, index) =>
          index === 0 ? { ...hackathon, links: [...hackathon.links, `Task: ${taskText}${priority !== 'medium' ? ` (${priority})` : ''}${dueDate ? ` - Due: ${dueDate}` : ''}`] } : hackathon
        ));
      }
    }

    if (modalConfig.type === 'SELECT_CATEGORY_FOR_TASK') {
      const selectedCategoryId = formData.get('category');

      // Check if it's a custom section
      const selectedCategory = customSections.find(s => s.id === selectedCategoryId);
      if (selectedCategory) {
        setModalConfig({ type: 'QUICK_ADD_TASK', data: selectedCategory });
        return; // Don't close the modal, just change its type
      }

      // Handle core categories
      const coreCategoryData = {
        courses: { id: 'courses', label: 'SAP Courses', type: 'course' },
        internships: { id: 'internships', label: 'Internships', type: 'internship' },
        hackathons: { id: 'hackathons', label: 'Hackathons', type: 'hackathon' }
      }[selectedCategoryId];

      if (coreCategoryData) {
        setModalConfig({ type: 'QUICK_ADD_TASK', data: coreCategoryData });
        return; // Don't close the modal, just change its type
      }
    }

    setModalConfig(null);
  };

  const toggleTask = (sectionId, taskId) => {
    setCustomTasks(prev => ({
      ...prev,
      [sectionId]: prev[sectionId].map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }));
  };

  const handleDeleteSection = (id) => {
    setCustomSections(prev => prev.filter(s => s.id !== id));
    setCustomTasks(prev => { const n = { ...prev }; delete n[id]; return n; });
    setCustomProjects(prev => { const n = { ...prev }; delete n[id]; return n; });
    setActiveTab('dashboard');
  };

  const handleProjectUpdate = (sectionId, projectId, updates) => {
    setCustomProjects(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).map(p => p.id === projectId ? { ...p, ...updates } : p)
    }));
  };

  const handleDeleteProject = (sectionId, projectId) => {
    setCustomProjects(prev => ({
      ...prev,
      [sectionId]: (prev[sectionId] || []).filter(p => p.id !== projectId)
    }));
  };

  const handleDeleteCourse = (id) => {
    setCourses(prev => prev.filter(c => c.id !== id));
  };

  const handleCourseUpdate = (id, updates) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteInternship = (id) => {
    setInternships(prev => prev.filter(i => i.id !== id));
  };
  const handleInternshipUpdate = (id, updates) => {
    setInternships(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleDeleteHackathon = (id) => {
    setHackathons(prev => prev.filter(h => h.id !== id));
  };
  const handleHackathonUpdate = (id, updates) => {
    setHackathons(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleDeleteCoreSection = (sectionType) => {
    const sectionLabelMap = {
      courses: 'SAP Courses',
      internships: 'Internships',
      hackathons: 'Hackathons'
    };

    const confirmed = window.confirm(`Delete all items in ${sectionLabelMap[sectionType]} section?`);
    if (!confirmed) return;

    if (sectionType === 'courses') {
      setCourses([]);
      setCalendarEvents(prev => prev.filter(event => event.type !== 'course'));
    }

    if (sectionType === 'internships') {
      setInternships([]);
      setCalendarEvents(prev => prev.filter(event => event.type !== 'internship'));
    }

    if (sectionType === 'hackathons') {
      setHackathons([]);
      setCalendarEvents(prev => prev.filter(event => event.type !== 'hackathon'));
    }
  };

  const handleAddTask = (sectionId, e) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      setCustomTasks(prev => ({
        ...prev,
        [sectionId]: [...(prev[sectionId] || []), { id: Date.now(), text: newTaskText, completed: false }]
      }));
      setNewTaskText('');
    }
  };

  const renderDashboard = () => (
    <div className="animate-fade-in stagger-1">
      <div className="dashboard-grid">
        <div className="glass stat-card">
          <div className="stat-icon emerald"><BookOpen /></div>
          <div className="stat-info">
            <h4>Active Courses</h4>
            <div className="value">2</div>
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon purple"><Briefcase /></div>
          <div className="stat-info">
            <h4>IBM Internships</h4>
            <div className="value">3</div>
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-icon cyan"><Trophy /></div>
          <div className="stat-info">
            <h4>Hackathon Finals</h4>
            <div className="value">2</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <div className="glass data-card p-6 animate-fade-in stagger-2">
          <h3 className="card-title text-gradient" style={{ marginBottom: '1rem' }}>Immediate Action Required</h3>
          <ul className="task-list">
            <li className="task-item">
              <AlertCircle size={18} className="task-icon" style={{ color: 'var(--status-deadline)' }} />
              <span><strong>IBM AI Strategist:</strong> Submit Weekly Attendance Form by Friday</span>
            </li>
            <li className="task-item">
              <Clock size={18} className="task-icon" style={{ color: 'var(--status-pending)' }} />
              <span><strong>SAP ABAP:</strong> Module 4 Assessment (Due in 5 days)</span>
            </li>
            <li className="task-item">
              <CheckCircle2 size={18} className="task-icon" style={{ color: 'var(--status-active)' }} />
              <span><strong>SIH 2025:</strong> Finalize Nodal Center travel details</span>
            </li>
          </ul>
        </div>
        <div className="glass data-card p-6 animate-fade-in stagger-3">
          <h3 className="card-title text-gradient" style={{ marginBottom: '1rem' }}>Upcoming Events</h3>
          <ul className="task-list">
            <li className="task-item">
              <Video size={18} className="task-icon" />
              <span><strong>IBM AI/ML:</strong> Masterclass - Thursday, 6 PM PST</span>
            </li>
            <li className="task-item">
              <Calendar size={18} className="task-icon" />
              <span><strong>Odoo Hackathon:</strong> Starts on April 30th</span>
            </li>
          </ul>
          <button className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => setActiveTab('hackathons')}>
            View All Events
          </button>
        </div>
      </div>
    </div>
  );

  const renderCourses = () => (
    <div className="animate-fade-in stagger-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Current Enrollments</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            style={{ color: 'var(--status-deadline)', borderColor: 'var(--status-deadline)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => handleDeleteCoreSection('courses')}
          >
            <Trash2 size={14} /> Delete Section
          </button>
          <button className="btn btn-primary" onClick={() => openModal('ADD_COURSE', null, { hasDate: true, hasDesc: true, hasOrg: true })}><PlusCircle size={16} /> Add Course</button>
        </div>
      </div>
      <div className="section-grid">
        {courses.map((course, idx) => {
          const completedTasks = course.tasks.filter(t => (typeof t === 'object' ? t.completed : false)).length;
          const progress = course.tasks.length === 0 ? (course.progress || 0) : Math.round((completedTasks / course.tasks.length) * 100);
          return (
            <div className={`glass data-card animate-fade-in stagger-${(idx % 4) + 1}`} key={course.id}>
              <div className="card-header">
                <div style={{ paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    {course.courseLink ? (
                      <a href={course.courseLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="card-title hover-underline" style={{ cursor: 'pointer', lineHeight: '1.2' }}>{course.title}</h3>
                      </a>
                    ) : (
                      <h3 className="card-title" style={{ lineHeight: '1.2' }}>{course.title}</h3>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        const newLink = window.prompt("Enter the link URL for this course:", course.courseLink || "");
                        if (newLink !== null) {
                          handleCourseUpdate(course.id, { courseLink: newLink });
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title={course.courseLink ? "Update Link" : "Add Link"}
                    >
                      <ExternalLink size={16} style={{ color: course.courseLink ? '#10b981' : 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => openModal('EDIT_COURSE', course, { hasDate: true, hasDesc: true, hasOrg: true })}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Edit Course"
                    >
                      <Edit2 size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Delete Course"
                    >
                      <Trash2 size={16} style={{ color: 'var(--status-deadline)' }} />
                    </button>
                  </div>

                  <div className="card-org" style={{ marginTop: '0.2rem' }}><BookOpen size={14} /> {course.organization}</div>
                </div>
                <select
                  className={`badge ${course.status}`}
                  value={course.status}
                  onChange={(e) => handleCourseUpdate(course.id, { status: e.target.value })}
                  style={{
                    padding: '0.2rem 0.5rem', outline: 'none', border: '1px solid var(--panel-border)',
                    background: 'var(--sidebar-bg)', cursor: 'pointer', appearance: 'none', minWidth: '90px', textAlign: 'center', fontWeight: 'bold',
                    color: course.status === 'completed' ? '#10b981' :
                      course.status === 'pending' ? 'white' :
                        '#10b981' // Green for active too per reference screenshot
                  }}
                >
                  <option value="active" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>ACTIVE</option>
                  <option value="pending" style={{ background: '#666', color: 'white' }}>PENDING</option>
                  <option value="completed" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>COMPLETED</option>
                </select>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{course.description}</p>

                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Pending Tasks:</h4>
                <ul className="task-list" style={{ marginTop: 0 }}>
                  {course.tasks.map((task, i) => {
                    const isCompleted = typeof task === 'object' ? task.completed : false;
                    const taskText = typeof task === 'object' ? task.text : task;
                    return (
                      <li className="task-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div
                          style={{ cursor: 'pointer', marginTop: '2px', color: isCompleted ? '#10b981' : 'var(--text-muted)' }}
                          onClick={() => {
                            const newTasks = [...course.tasks];
                            newTasks[i] = typeof task === 'object' ? { ...task, completed: !task.completed } : { text: taskText, completed: !isCompleted };
                            handleCourseUpdate(course.id, { tasks: newTasks });
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '16px', height: '16px', border: '1.5px solid currentColor', borderRadius: '4px' }}></div>}
                        </div>
                        <span style={{ fontSize: '0.9rem', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                          {taskText}
                        </span>
                        <button
                          onClick={() => handleCourseUpdate(course.id, { tasks: course.tasks.filter((_, idx) => idx !== i) })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', marginLeft: 'auto', padding: '0 0.2rem' }}
                          title="Remove Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.taskInput;
                  if (input.value.trim()) {
                    handleCourseUpdate(course.id, { tasks: [...course.tasks, { text: input.value.trim(), completed: false }] });
                    input.value = '';
                  }
                }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input name="taskInput" placeholder="Add a new task..." style={{ flexGrow: 1, padding: '0.4rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }} />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }}><Plus size={14} /></button>
                </form>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Notes & Remarks:</h4>
                  <textarea
                    defaultValue={course.notes || ''}
                    onBlur={(e) => handleCourseUpdate(course.id, { notes: e.target.value })}
                    placeholder="Add important points/remarks here..."
                    rows={2}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Important Links:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(Array.isArray(course.links) ? course.links : []).map((link, i) => {
                      const linkObj = typeof link === 'object' ? link : { label: `Link ${i + 1}`, url: link || '' };
                      return (
                        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', borderRadius: '999px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                          {linkObj.url ? (
                            <a href={linkObj.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{linkObj.label}</a>
                          ) : (
                            <span>{linkObj.label}</span>
                          )}
                          <button
                            onClick={() => {
                              const newUrl = window.prompt(`Enter URL for "${linkObj.label}":`, linkObj.url || '');
                              if (newUrl !== null) {
                                const existing = Array.isArray(course.links) ? course.links : [];
                                const newLinks = existing.map((l, li) => li === i ? { label: linkObj.label, url: newUrl } : (typeof l === 'object' ? l : { label: `Link ${li + 1}`, url: l || '' }));
                                handleCourseUpdate(course.id, { links: newLinks, courseLink: newLinks[0]?.url || course.courseLink || '' });
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: linkObj.url ? '#10b981' : '#38bdf8', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title={linkObj.url ? 'Update URL' : 'Add URL'}
                          >
                            <ExternalLink size={11} />
                          </button>
                          <button
                            onClick={() => {
                              const existing = Array.isArray(course.links) ? course.links : [];
                              const newLinks = existing.filter((_, li) => li !== i);
                              handleCourseUpdate(course.id, { links: newLinks, courseLink: newLinks[0]?.url || '' });
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title="Remove Link"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        const linkLabel = window.prompt('Enter link label (e.g., Docs, Portal):', 'Course Link');
                        if (!linkLabel) return;
                        const linkUrl = window.prompt('Enter link URL:', '');
                        if (linkUrl === null) return;
                        const existing = Array.isArray(course.links) ? course.links : [];
                        const newLinks = [...existing, { label: linkLabel, url: linkUrl }];
                        handleCourseUpdate(course.id, { links: newLinks, courseLink: newLinks[0]?.url || course.courseLink || '' });
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      + Add Link
                    </button>
                  </div>
                </div>

                <div className="progress-wrapper" style={{ marginTop: '1.5rem' }}>
                  <div className="progress-meta">
                    <span>Course Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span>Deadline: <strong>{course.deadline}</strong></span>
                {course.courseLink ? (
                  <a href={course.courseLink} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.4rem 1rem', textDecoration: 'none' }}>Enter Course</a>
                ) : (
                  <button className="btn btn-outline" style={{ padding: '0.4rem 1rem' }} onClick={() => {
                    const newLink = window.prompt("Enter the link URL for this course:", "");
                    if (newLink !== null) handleCourseUpdate(course.id, { courseLink: newLink });
                  }}>Add Link First</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderInternships = () => (
    <div className="animate-fade-in stagger-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Active Programs</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            style={{ color: 'var(--status-deadline)', borderColor: 'var(--status-deadline)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => handleDeleteCoreSection('internships')}
          >
            <Trash2 size={14} /> Delete Section
          </button>
          <button className="btn btn-primary" onClick={() => openModal('ADD_INTERNSHIP', null, { hasDate: true, hasDesc: true, hasOrg: true })}><PlusCircle size={16} /> Add Program</button>
        </div>
      </div>
      <div className="section-grid">
        {internships.map((intern, idx) => {
          const completedTasks = intern.tasks.filter(t => typeof t === 'object' && t.completed).length;
          const internProgress = intern.tasks.length === 0 ? (intern.progress || 0) : Math.round((completedTasks / intern.tasks.length) * 100);
          return (
            <div className={`glass data-card animate-fade-in stagger-${(idx % 4) + 1}`} key={intern.id}>
              <div className="card-header">
                <div style={{ paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    {intern.internLink ? (
                      <a href={intern.internLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="card-title hover-underline" style={{ cursor: 'pointer', lineHeight: '1.2' }}>{intern.title}</h3>
                      </a>
                    ) : (
                      <h3 className="card-title" style={{ lineHeight: '1.2' }}>{intern.title}</h3>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        const newLink = window.prompt("Enter the link URL for this internship:", intern.internLink || "");
                        if (newLink !== null) { handleInternshipUpdate(intern.id, { internLink: newLink }); }
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title={intern.internLink ? "Update Link" : "Add Link"}
                    >
                      <ExternalLink size={16} style={{ color: intern.internLink ? '#10b981' : 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => openModal('EDIT_INTERNSHIP', intern, { hasDate: true, hasDesc: true, hasOrg: true })}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Edit Internship"
                    >
                      <Edit2 size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteInternship(intern.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Delete Internship"
                    >
                      <Trash2 size={16} style={{ color: 'var(--status-deadline)' }} />
                    </button>
                  </div>

                  <div className="card-org" style={{ marginTop: '0.2rem' }}><Briefcase size={14} /> {intern.organization}</div>
                </div>
                <select
                  className={`badge ${intern.status}`}
                  value={intern.status}
                  onChange={(e) => handleInternshipUpdate(intern.id, { status: e.target.value })}
                  style={{
                    padding: '0.2rem 0.5rem', outline: 'none', border: '1px solid var(--panel-border)',
                    background: 'var(--sidebar-bg)', cursor: 'pointer', appearance: 'none', minWidth: '90px', textAlign: 'center', fontWeight: 'bold',
                    color: intern.status === 'completed' ? '#10b981' : intern.status === 'pending' ? 'white' : '#10b981'
                  }}
                >
                  <option value="active" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>ACTIVE</option>
                  <option value="pending" style={{ background: '#666', color: 'white' }}>PENDING</option>
                  <option value="completed" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>COMPLETED</option>
                </select>
              </div>
              <div className="card-body">
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Sub-Tasks:</h4>
                <ul className="task-list" style={{ marginTop: 0 }}>
                  {intern.tasks.map((task, i) => {
                    const isCompleted = typeof task === 'object' ? task.completed : false;
                    const taskText = typeof task === 'object' ? task.text : task;
                    return (
                      <li className="task-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div
                          style={{ cursor: 'pointer', marginTop: '2px', color: isCompleted ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}
                          onClick={() => {
                            const newTasks = [...intern.tasks];
                            newTasks[i] = { text: taskText, completed: !isCompleted };
                            handleInternshipUpdate(intern.id, { tasks: newTasks });
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '16px', height: '16px', border: '1.5px solid currentColor', borderRadius: '4px' }}></div>}
                        </div>
                        <span style={{ fontSize: '0.9rem', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>{taskText}</span>
                        <button
                          onClick={() => handleInternshipUpdate(intern.id, { tasks: intern.tasks.filter((_, idx) => idx !== i) })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', marginLeft: 'auto', padding: '0 0.2rem' }}
                          title="Remove Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.internTaskInput;
                  if (input.value.trim()) {
                    handleInternshipUpdate(intern.id, { tasks: [...intern.tasks, { text: input.value.trim(), completed: false }] });
                    input.value = '';
                  }
                }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input name="internTaskInput" placeholder="Add a new task..." style={{ flexGrow: 1, padding: '0.4rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }} />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }}><Plus size={14} /></button>
                </form>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Notes & Remarks:</h4>
                  <textarea
                    defaultValue={intern.notes || ''}
                    onBlur={(e) => handleInternshipUpdate(intern.id, { notes: e.target.value })}
                    placeholder="Add important points/remarks here..."
                    rows={2}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Important Links:</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(Array.isArray(intern.links) ? intern.links : []).map((link, i) => {
                      const linkObj = typeof link === 'object' ? link : { label: `Link ${i + 1}`, url: link || '' };
                      return (
                        <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', borderRadius: '999px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                          {linkObj.url ? (
                            <a href={linkObj.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{linkObj.label}</a>
                          ) : (
                            <span>{linkObj.label}</span>
                          )}
                          <button
                            onClick={() => {
                              const newUrl = window.prompt(`Enter URL for "${linkObj.label}":`, linkObj.url || '');
                              if (newUrl !== null) {
                                const existing = Array.isArray(intern.links) ? intern.links : [];
                                const newLinks = existing.map((l, li) => li === i ? { label: linkObj.label, url: newUrl } : (typeof l === 'object' ? l : { label: `Link ${li + 1}`, url: l || '' }));
                                handleInternshipUpdate(intern.id, { links: newLinks, internLink: newLinks[0]?.url || intern.internLink || '' });
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: linkObj.url ? '#10b981' : '#38bdf8', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title={linkObj.url ? 'Update URL' : 'Add URL'}
                          >
                            <ExternalLink size={11} />
                          </button>
                          <button
                            onClick={() => {
                              const existing = Array.isArray(intern.links) ? intern.links : [];
                              const newLinks = existing.filter((_, li) => li !== i);
                              handleInternshipUpdate(intern.id, { links: newLinks, internLink: newLinks[0]?.url || '' });
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', padding: 0, display: 'flex' }}
                            title="Remove Link"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        const linkLabel = window.prompt('Enter link label (e.g., Docs, Portal):', 'Program Link');
                        if (!linkLabel) return;
                        const linkUrl = window.prompt('Enter link URL:', '');
                        if (linkUrl === null) return;
                        const existing = Array.isArray(intern.links) ? intern.links : [];
                        const newLinks = [...existing, { label: linkLabel, url: linkUrl }];
                        handleInternshipUpdate(intern.id, { links: newLinks, internLink: newLinks[0]?.url || intern.internLink || '' });
                      }}
                      className="btn btn-outline"
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      + Add Link
                    </button>
                  </div>
                </div>

                <div className="progress-wrapper" style={{ marginTop: '1.5rem' }}>
                  <div className="progress-meta">
                    <span>Program Completion</span>
                    <span>{internProgress}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${internProgress}%`, background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', transition: 'width 0.3s ease' }}></div>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <span>Deadline: <strong>{intern.deadline}</strong></span>
                {intern.internLink ? (
                  <a href={intern.internLink} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.4rem 1rem', textDecoration: 'none' }}>Open Program</a>
                ) : (
                  <button className="btn btn-outline" style={{ padding: '0.4rem 1rem' }}>Submit Forms</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderHackathons = () => (
    <div className="animate-fade-in stagger-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>Registered Events</h2>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-outline"
            style={{ color: 'var(--status-deadline)', borderColor: 'var(--status-deadline)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            onClick={() => handleDeleteCoreSection('hackathons')}
          >
            <Trash2 size={14} /> Delete Section
          </button>
          <button className="btn btn-primary" onClick={() => openModal('ADD_HACKATHON', null, { hasDate: true, hasDesc: true, hasOrg: true })}><PlusCircle size={16} /> Add Hackathon</button>
        </div>
      </div>
      <div className="section-grid">
        {hackathons.map((hackathon, idx) => {
          const completedHTasks = hackathon.tasks.filter(t => typeof t === 'object' && t.completed).length;
          const hackProgress = hackathon.tasks.length === 0 ? 0 : Math.round((completedHTasks / hackathon.tasks.length) * 100);
          return (
            <div className={`glass data-card animate-fade-in stagger-${(idx % 4) + 1}`} key={hackathon.id}>
              <div className="card-header">
                <div style={{ paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    {hackathon.hackathonLink ? (
                      <a href={hackathon.hackathonLink} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 className="card-title hover-underline" style={{ cursor: 'pointer', lineHeight: '1.2' }}>{hackathon.title}</h3>
                      </a>
                    ) : (
                      <h3 className="card-title" style={{ lineHeight: '1.2' }}>{hackathon.title}</h3>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        const newLink = window.prompt("Enter the link URL for this hackathon:", hackathon.hackathonLink || "");
                        if (newLink !== null) { handleHackathonUpdate(hackathon.id, { hackathonLink: newLink }); }
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title={hackathon.hackathonLink ? "Update Link" : "Add Link"}
                    >
                      <ExternalLink size={16} style={{ color: hackathon.hackathonLink ? '#10b981' : 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => openModal('EDIT_HACKATHON', hackathon, { hasDate: true, hasDesc: true, hasOrg: true })}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Edit Hackathon"
                    >
                      <Edit2 size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <button
                      onClick={() => handleDeleteHackathon(hackathon.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                      title="Delete Hackathon"
                    >
                      <Trash2 size={16} style={{ color: 'var(--status-deadline)' }} />
                    </button>
                  </div>

                  <div className="card-org" style={{ marginTop: '0.2rem' }}><Trophy size={14} /> {hackathon.organization}</div>
                </div>
                <select
                  className={`badge ${hackathon.status}`}
                  value={hackathon.status}
                  onChange={(e) => handleHackathonUpdate(hackathon.id, { status: e.target.value })}
                  style={{
                    padding: '0.2rem 0.5rem', outline: 'none', border: '1px solid var(--panel-border)',
                    background: 'var(--sidebar-bg)', cursor: 'pointer', appearance: 'none', minWidth: '90px', textAlign: 'center', fontWeight: 'bold',
                    color: hackathon.status === 'completed' ? '#10b981' : hackathon.status === 'pending' ? '#eab308' : '#10b981'
                  }}
                >
                  <option value="active" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>ACTIVE</option>
                  <option value="pending" style={{ background: 'var(--bg-dark)', color: '#eab308' }}>PENDING</option>
                  <option value="completed" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>COMPLETED</option>
                </select>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{hackathon.description}</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ background: 'var(--hover-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Date</div>
                    <input
                      type="date"
                      defaultValue={hackathon.date}
                      onBlur={(e) => handleHackathonUpdate(hackathon.id, { date: e.target.value })}
                      style={{ fontWeight: '600', marginTop: '0.2rem', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', cursor: 'text', width: '100%', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div style={{ background: 'var(--hover-bg)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Team Size</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <input
                        type="number"
                        defaultValue={hackathon.teamSize}
                        min="1" max="99"
                        onBlur={(e) => handleHackathonUpdate(hackathon.id, { teamSize: parseInt(e.target.value) || hackathon.teamSize })}
                        style={{ fontWeight: '600', background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', cursor: 'text', width: '40px', fontSize: '0.95rem' }}
                      />
                      <span style={{ fontWeight: '600' }}>Members</span>
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Important Links:</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {(Array.isArray(hackathon.links) ? hackathon.links : []).map((link, i) => {
                    const linkObj = typeof link === 'object' ? link : { label: link, url: '' };
                    return (
                      <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', borderRadius: '999px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                        {linkObj.url ? (
                          <a href={linkObj.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{linkObj.label}</a>
                        ) : (
                          <span>{linkObj.label}</span>
                        )}
                        <button
                          onClick={() => {
                            const newUrl = window.prompt(`Enter URL for "${linkObj.label}":`, linkObj.url || '');
                            if (newUrl !== null) {
                              const existing = Array.isArray(hackathon.links) ? hackathon.links : [];
                              const newLinks = existing.map((l, li) => li === i ? { label: linkObj.label, url: newUrl } : (typeof l === 'object' ? l : { label: l, url: '' }));
                              handleHackathonUpdate(hackathon.id, { links: newLinks, hackathonLink: newLinks[0]?.url || hackathon.hackathonLink || '' });
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: linkObj.url ? '#10b981' : '#38bdf8', cursor: 'pointer', padding: 0, display: 'flex' }}
                          title={linkObj.url ? "Update URL" : "Add URL"}
                        >
                          <ExternalLink size={11} />
                        </button>
                        <button
                          onClick={() => {
                            const existing = Array.isArray(hackathon.links) ? hackathon.links : [];
                            const newLinks = existing.filter((_, li) => li !== i);
                            handleHackathonUpdate(hackathon.id, { links: newLinks, hackathonLink: newLinks[0]?.url || '' });
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', padding: 0, display: 'flex' }}
                          title="Remove Link"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => {
                      const linkLabel = window.prompt('Enter link label (e.g., Rulebook, Submission):', 'Hackathon Link');
                      if (!linkLabel) return;
                      const linkUrl = window.prompt('Enter link URL:', '');
                      if (linkUrl === null) return;
                      const existing = Array.isArray(hackathon.links) ? hackathon.links : [];
                      const newLinks = [...existing, { label: linkLabel, url: linkUrl }];
                      handleHackathonUpdate(hackathon.id, { links: newLinks, hackathonLink: newLinks[0]?.url || hackathon.hackathonLink || '' });
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    + Add Link
                  </button>
                </div>

                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Sub-Tasks:</h4>
                <ul className="task-list" style={{ marginTop: 0 }}>
                  {hackathon.tasks.map((task, i) => {
                    const isCompleted = typeof task === 'object' ? task.completed : false;
                    const taskText = typeof task === 'object' ? task.text : task;
                    return (
                      <li className="task-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div
                          style={{ cursor: 'pointer', marginTop: '2px', color: isCompleted ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}
                          onClick={() => {
                            const newTasks = [...hackathon.tasks];
                            newTasks[i] = { text: taskText, completed: !isCompleted };
                            handleHackathonUpdate(hackathon.id, { tasks: newTasks });
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '16px', height: '16px', border: '1.5px solid currentColor', borderRadius: '4px' }}></div>}
                        </div>
                        <span style={{ fontSize: '0.9rem', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>{taskText}</span>
                        <button
                          onClick={() => handleHackathonUpdate(hackathon.id, { tasks: hackathon.tasks.filter((_, ti) => ti !== i) })}
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', marginLeft: 'auto', padding: '0 0.2rem' }}
                          title="Remove Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.hackTaskInput;
                  if (input.value.trim()) {
                    handleHackathonUpdate(hackathon.id, { tasks: [...hackathon.tasks, { text: input.value.trim(), completed: false }] });
                    input.value = '';
                  }
                }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input name="hackTaskInput" placeholder="Add a new task..." style={{ flexGrow: 1, padding: '0.4rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }} />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }}><Plus size={14} /></button>
                </form>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Notes & Remarks:</h4>
                  <textarea
                    defaultValue={hackathon.notes || ''}
                    onBlur={(e) => handleHackathonUpdate(hackathon.id, { notes: e.target.value })}
                    placeholder="Add important points/remarks here..."
                    rows={2}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                  />
                </div>

                {hackathon.tasks.length > 0 && (
                  <div className="progress-wrapper" style={{ marginTop: '1.5rem' }}>
                    <div className="progress-meta">
                      <span>Task Progress</span>
                      <span>{hackProgress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${hackProgress}%`, transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="card-footer">
                {hackathon.hackathonLink ? (
                  <a href={hackathon.hackathonLink} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>Manage Registration & Dashboard</a>
                ) : (
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Manage Registration & Dashboard</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  const renderCalendar = () => {
    let dynamicEvents = [];
    
    const addEvents = (sourceArray, defaultColor) => {
      sourceArray.forEach(item => {
        let color = defaultColor;
        if (item.status === 'completed') color = '#10b981';
        else if (item.status === 'pending') color = '#eab308';
        else if (item.status === 'active') color = '#38bdf8';
        
        const bg = `${color}25`;

        if (item.date) {
          dynamicEvents.push({ id: `date-${item.id}`, date: item.date, title: item.title, color, bg });
        }
        if (item.deadline && item.deadline !== item.date) {
          dynamicEvents.push({ id: `dl-${item.id}`, date: item.deadline, title: `${item.title} (Deadline)`, color: '#ef4444', bg: '#ef444425' });
        }
      });
    };

    if (activeTab === 'calendar') {
      dynamicEvents = [...calendarEvents].map(e => ({...e, color: '#a855f7', bg: '#a855f725'}));
      addEvents(courses, '#3b82f6');
      addEvents(internships, '#a855f7');
      addEvents(hackathons, '#eab308');
      Object.keys(customProjects).forEach(secId => addEvents(customProjects[secId], '#ec4899'));
    } else if (activeTab === 'courses') {
      addEvents(courses, '#3b82f6');
    } else if (activeTab === 'internships') {
      addEvents(internships, '#a855f7');
    } else if (activeTab === 'hackathons') {
      addEvents(hackathons, '#eab308');
    } else if (customProjects[activeTab]) {
      addEvents(customProjects[activeTab], '#ec4899');
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="glass data-card animate-fade-in stagger-1" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <h2 className="card-title text-gradient" style={{ fontSize: '1.75rem' }}>{activeTab === 'calendar' ? 'Master Calendar' : 'Section Calendar'} - {format(currentDate, 'MMMM yyyy')}</h2>
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openModal('ADD_CALENDAR', null, { hasDate: true })}>+ Event</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronRight style={{ transform: 'rotate(180deg)' }} /></button>
            <button className="btn btn-outline" style={{ padding: '0.5rem' }} onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '1rem' }}>{day}</div>
          ))}
          {dateRange.map((day, i) => {
            const isTodayDate = isToday(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayEvents = dynamicEvents.filter(e => e.date && isSameDay(parseISO(e.date), day));
            return (
              <div key={i} style={{
                minHeight: '100px',
                padding: '0.5rem',
                borderRadius: '8px',
                background: isTodayDate ? 'var(--hover-border)' : 'var(--hover-bg)',
                border: isTodayDate ? '1px solid var(--accent-glow)' : '1px solid transparent',
                opacity: isCurrentMonth ? 1 : 0.4
              }}>
                <div style={{ fontWeight: '500', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{format(day, 'd')}</span>
                  {isTodayDate && <span style={{ fontSize: '0.7rem', color: 'var(--accent-glow)' }}>Today</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {dayEvents.map((ev, ei) => (
                    <div key={ei} style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.4rem', borderRadius: '4px',
                      background: ev.bg,
                      color: ev.color,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontWeight: '600'
                    }}>
                      • {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCustomSection = (section) => {
    const projects = customProjects[section.id] || [];

    return (
      <div className="animate-fade-in stagger-1">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>{section.label} Projects</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-outline" style={{ color: 'var(--status-deadline)', borderColor: 'var(--status-deadline)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleDeleteSection(section.id)}>
              <Trash2 size={14} /> Delete Section
            </button>
            <button className="btn btn-primary" onClick={() => openModal('ADD_PROJECT', null, { hasDate: true, hasDesc: true })}>
              <PlusCircle size={16} /> Add Project
            </button>
          </div>
        </div>

        {projects.length === 0 && (
          <div className="glass data-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No projects yet in <strong>{section.label}</strong>.</p>
            <button className="btn btn-primary" onClick={() => openModal('ADD_PROJECT', null, { hasDate: true, hasDesc: true })}>
              <PlusCircle size={16} /> Add Your First Project
            </button>
          </div>
        )}

        <div className="section-grid">
          {projects.map((project, idx) => {
            const completedTasks = project.tasks.filter(t => t.completed).length;
            const progress = project.tasks.length === 0 ? 0 : Math.round((completedTasks / project.tasks.length) * 100);
            return (
              <div className={`glass data-card animate-fade-in stagger-${(idx % 4) + 1}`} key={project.id}>
                <div className="card-header">
                  <div style={{ paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <h3 className="card-title" style={{ lineHeight: '1.2' }}>{project.title}</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button
                        onClick={() => openModal('EDIT_PROJECT_CARD', null, { hasDate: true, hasDesc: true, sectionId: section.id, projectId: project.id, data: project })}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        title="Edit Project"
                      >
                        <Edit2 size={16} style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteProject(section.id, project.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        title="Delete Project"
                      >
                        <Trash2 size={16} style={{ color: 'var(--status-deadline)' }} />
                      </button>
                    </div>
                    {project.description && <div className="card-org" style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>{project.description}</div>}
                    {project.date && <div style={{ fontSize: '0.8rem', color: 'var(--status-pending)' }}>📅 Deadline: {project.date}</div>}
                  </div>
                  <select
                    className={`badge ${project.status}`}
                    value={project.status}
                    onChange={(e) => handleProjectUpdate(section.id, project.id, { status: e.target.value })}
                    style={{
                      padding: '0.2rem 0.5rem', outline: 'none', border: '1px solid var(--panel-border)',
                      background: 'var(--sidebar-bg)', cursor: 'pointer', appearance: 'none', minWidth: '90px', textAlign: 'center', fontWeight: 'bold',
                      color: project.status === 'completed' ? '#10b981' : project.status === 'pending' ? '#eab308' : '#10b981'
                    }}
                  >
                    <option value="active" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>ACTIVE</option>
                    <option value="pending" style={{ background: 'var(--bg-dark)', color: '#eab308' }}>PENDING</option>
                    <option value="completed" style={{ background: 'var(--bg-dark)', color: '#10b981' }}>COMPLETED</option>
                  </select>
                </div>

                <div className="card-body">
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Sub-Tasks:</h4>
                  <ul className="task-list" style={{ marginTop: 0 }}>
                    {project.tasks.map((task, i) => {
                      const isCompleted = task.completed;
                      return (
                        <li className="task-item" key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div
                            style={{ cursor: 'pointer', marginTop: '2px', color: isCompleted ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}
                            onClick={() => {
                              const newTasks = [...project.tasks];
                              newTasks[i] = { ...task, completed: !isCompleted };
                              handleProjectUpdate(section.id, project.id, { tasks: newTasks });
                            }}
                          >
                            {isCompleted ? <CheckCircle2 size={16} /> : <div style={{ width: '16px', height: '16px', border: '1.5px solid currentColor', borderRadius: '4px' }}></div>}
                          </div>
                          <span style={{ fontSize: '0.9rem', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>{task.text}</span>
                          <button
                            onClick={() => handleProjectUpdate(section.id, project.id, { tasks: project.tasks.filter((_, ti) => ti !== i) })}
                            style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', marginLeft: 'auto', padding: '0 0.2rem' }}
                            title="Remove Task"
                          >
                            <Trash2 size={12} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.target.elements.projTaskInput;
                    if (input.value.trim()) {
                      handleProjectUpdate(section.id, project.id, { tasks: [...project.tasks, { text: input.value.trim(), completed: false }] });
                      input.value = '';
                    }
                  }} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input name="projTaskInput" placeholder="Add a new task..." style={{ flexGrow: 1, padding: '0.4rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }} />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.6rem' }}><Plus size={14} /></button>
                  </form>

                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Notes & Remarks:</h4>
                    <textarea
                      defaultValue={project.notes || ''}
                      onBlur={(e) => handleProjectUpdate(section.id, project.id, { notes: e.target.value })}
                      placeholder="Add important points/remarks here..."
                      rows={2}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--hover-bg)', border: '1px solid var(--panel-border)', color: 'var(--text-main)', fontSize: '0.8rem', resize: 'vertical', outline: 'none' }}
                    />
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Important Links:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {(Array.isArray(project.links) ? project.links : []).map((link, i) => {
                        const linkObj = typeof link === 'object' ? link : { label: `Link ${i + 1}`, url: link || '' };
                        return (
                          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: 'rgba(14, 165, 233, 0.1)', color: '#38bdf8', borderRadius: '999px', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                            {linkObj.url ? (
                              <a href={linkObj.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{linkObj.label}</a>
                            ) : (
                              <span>{linkObj.label}</span>
                            )}
                            <button
                              onClick={() => {
                                const newUrl = window.prompt(`Enter URL for "${linkObj.label}":`, linkObj.url || '');
                                if (newUrl !== null) {
                                  const existing = Array.isArray(project.links) ? project.links : [];
                                  const newLinks = existing.map((l, li) => li === i ? { label: linkObj.label, url: newUrl } : (typeof l === 'object' ? l : { label: `Link ${li + 1}`, url: l || '' }));
                                  handleProjectUpdate(section.id, project.id, { links: newLinks });
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: linkObj.url ? '#10b981' : '#38bdf8', cursor: 'pointer', padding: 0, display: 'flex' }}
                              title={linkObj.url ? 'Update URL' : 'Add URL'}
                            >
                              <ExternalLink size={11} />
                            </button>
                            <button
                              onClick={() => {
                                const existing = Array.isArray(project.links) ? project.links : [];
                                const newLinks = existing.filter((_, li) => li !== i);
                                handleProjectUpdate(section.id, project.id, { links: newLinks });
                              }}
                              style={{ background: 'transparent', border: 'none', color: 'var(--status-deadline)', cursor: 'pointer', padding: 0, display: 'flex' }}
                              title="Remove Link"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => {
                          const linkLabel = window.prompt('Enter link label (e.g., Repo, Docs):', 'Project Link');
                          if (!linkLabel) return;
                          const linkUrl = window.prompt('Enter link URL:', '');
                          if (linkUrl === null) return;
                          const existing = Array.isArray(project.links) ? project.links : [];
                          const newLinks = [...existing, { label: linkLabel, url: linkUrl }];
                          handleProjectUpdate(section.id, project.id, { links: newLinks });
                        }}
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        + Add Link
                      </button>
                    </div>
                  </div>

                  <div className="progress-wrapper" style={{ marginTop: '1.5rem' }}>
                    <div className="progress-meta">
                      <span>Project Completion</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="app-container">
      {/* Sidebar Overlay (Glass) */}
      <aside className="sidebar">
        <div className="logo-section animate-fade-in stagger-1">
          <Activity className="logo-icon" size={28} />
          <span className="text-gradient">Daily Loop</span>
        </div>

        <ul className="nav-links animate-fade-in stagger-2">
          {navItems.map((item) => {
            const Icon = item.icon || Folder;
            return (
              <li
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </li>
            )
          })}

          <div style={{ margin: '1rem 0', height: '1px', background: 'var(--panel-border)' }}></div>

          <li className="nav-item" onClick={() => openModal('ADD_PROJECT', null, { hasDate: true, hasDesc: true })} style={{ color: 'var(--text-muted)' }}>
            <Plus size={20} />
            <span>Add New Project</span>
          </li>

        </ul>

        <div className="user-profile animate-fade-in stagger-4">
          <div className="avatar">
             {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <span className="name" style={{fontSize: '0.85rem'}}>{currentUser?.email}</span>
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="role"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'left' }}
          >
            View Profile
          </button>
            <button 
                onClick={handleLogout}
                className="role hover:text-red-400 transition-colors flex items-center gap-1"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)', marginTop: '4px' }}
            >
                <LogOut size={12} /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="page-header animate-fade-in">
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              {tabLinks[activeTab] ? (
                <a href={tabLinks[activeTab]} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <h1 className="page-title text-gradient hover-underline" style={{ cursor: 'pointer', marginBottom: 0 }}>
                    {navItems.find(i => i.id === activeTab)?.label}
                  </h1>
                </a>
              ) : (
                <h1 className="page-title text-gradient" style={{ marginBottom: 0 }}>
                  {navItems.find(i => i.id === activeTab)?.label}
                </h1>
              )}
              <button
                onClick={() => {
                  const newLink = window.prompt("Enter the link URL for this section:", tabLinks[activeTab] || "");
                  if (newLink !== null) {
                    setTabLinks(prev => ({ ...prev, [activeTab]: newLink }));
                  }
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', marginTop: '0.8rem' }}
                title={tabLinks[activeTab] ? "Update Link" : "Add Link"}
              >
                <ExternalLink size={24} style={{ color: tabLinks[activeTab] ? '#10b981' : 'var(--text-muted)', transition: 'color 0.2s' }} />
              </button>
            </div>
            <p className="page-subtitle" style={{ marginTop: '0.5rem' }}>Manage your immersive workload and conquer deadlines.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              onClick={() => setIsProfileModalOpen(true)}
              style={{ gap: '0.4rem' }}
            >
              <User size={16} /> Profile
            </button>

            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{
                background: 'var(--panel-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--panel-border)',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontFamily: 'Outfit',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="deep-focus">🌙 Deep Focus Dark</option>
              <option value="clarity-control">☀️ Clarity & Control</option>
              <option value="cyber-agile">⚡ Cyber-Agile</option>
              <option value="cyber-neon">✨ Cyber Neon Hub</option>
            </select>

            <button className="btn btn-primary" onClick={() => {
              setModalConfig({ type: 'SELECT_CATEGORY_FOR_TASK' });
            }}>
              + Quick Add Task
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'courses' && renderCourses()}
        {activeTab === 'internships' && renderInternships()}
        {activeTab === 'hackathons' && renderHackathons()}
        {activeTab === 'calendar' && renderCalendar()}
        {customSections.find(s => s.id === activeTab) && renderCustomSection(customSections.find(s => s.id === activeTab))}

        {/* Show section-specific calendar unless we are on Dashboard or Calendar (where it's already rendered) */}
        {activeTab !== 'dashboard' && activeTab !== 'calendar' && (
          <div style={{ marginTop: '3rem' }}>
            {renderCalendar()}
          </div>
        )}
      </main>

      {isProfileModalOpen && (
        <div className="profile-modal-overlay" onClick={() => setIsProfileModalOpen(false)}>
          <div className="profile-modal-card glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="card-title text-gradient" style={{ fontSize: '1.4rem' }}>Profile</h2>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <div><strong>Email:</strong> {currentUser?.email || 'N/A'}</div>
              <div><strong>UID:</strong> {currentUser?.uid || 'N/A'}</div>
              <div><strong>Provider:</strong> {currentUser?.providerData?.[0]?.providerId || 'password'}</div>
              <div><strong>Name:</strong> {currentUser?.displayName || 'Not set'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsProfileModalOpen(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Form Modal Overlay */}
      {modalConfig && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 className="card-title text-gradient" style={{ fontSize: '1.5rem' }}>
                {modalConfig.type === 'SELECT_CATEGORY_FOR_TASK' ? 'Select Category for Task' : modalConfig.type === 'QUICK_ADD_TASK' ? 'Quick Add Task' : modalConfig.type.startsWith('ADD') ? 'Add New' : 'Edit'} Details
              </h2>
              <button onClick={() => setModalConfig(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {modalConfig.type === 'SELECT_CATEGORY_FOR_TASK' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Select Category *</label>
                  <select required name="category" style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--panel-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--panel-border)',
                    outline: 'none',
                    cursor: 'pointer'
                  }}>
                    <option value="" style={{ background: 'var(--panel-bg)', color: 'var(--text-muted)' }}>Choose a category...</option>
                    {/* Core categories */}
                    <option value="courses" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>SAP Courses</option>
                    <option value="internships" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>Internships</option>
                    <option value="hackathons" style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>Hackathons</option>
                    {/* Custom sections */}
                    {customSections.map(section => (
                      <option key={section.id} value={section.id} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)' }}>{section.label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Task Description *
                    </label>
                    <input required name="title" defaultValue={modalConfig.data?.title || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Priority</label>
                    <select name="priority" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }}>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Due Date</label>
                    <input type="date" name="dueDate" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none', colorScheme: 'dark' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Detailed Notes/Description</label>
                    <textarea name="notes" rows={3} placeholder="Add detailed notes or description..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none', resize: 'vertical' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Tags (comma-separated)</label>
                    <input name="tags" placeholder="e.g., urgent, work, personal" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status</label>
                    <select name="status" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }}>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on-hold">On Hold</option>
                    </select>
                  </div>

                  {modalConfig.type !== 'QUICK_ADD_TASK' && modalConfig.hasOrg && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Organization / Target</label>
                      <input name="organization" defaultValue={modalConfig.data?.organization || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none' }} />
                    </div>
                  )}

                  {modalConfig.type !== 'QUICK_ADD_TASK' && modalConfig.hasDate && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Date / Deadline (Optional)</label>
                      <input type="date" name="date" defaultValue={modalConfig.data?.date || modalConfig.data?.deadline || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none', colorScheme: 'dark' }} />
                    </div>
                  )}

                  {modalConfig.type !== 'QUICK_ADD_TASK' && modalConfig.hasDesc && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Short Description (Optional)</label>
                      <textarea name="description" defaultValue={modalConfig.data?.description || ''} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', outline: 'none', resize: 'vertical' }} />
                    </div>
                  )}
                </>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setModalConfig(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
