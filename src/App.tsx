import React, { useState, useEffect } from 'react';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, LayoutGrid, List, Trash2, Edit3 } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  projectId: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
}

type ViewMode = 'timeline' | 'kanban';

const STORAGE_KEY = 'roadmap-data';

const statusColors = {
  'not-started': 'bg-gray-100 text-gray-700 border-gray-200',
  'in-progress': 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
  'completed': 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
};

const statusIcons = {
  'not-started': Clock,
  'in-progress': AlertCircle,
  'completed': CheckCircle
};

const projectColors = [
  'bg-gradient-to-r from-purple-500 to-pink-500',
  'bg-gradient-to-r from-blue-500 to-cyan-500',
  'bg-gradient-to-r from-green-500 to-teal-500',
  'bg-gradient-to-r from-orange-500 to-red-500',
  'bg-gradient-to-r from-indigo-500 to-purple-500'
];

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Form states
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'not-started' as const
  });

  // Load data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const { projects: savedProjects, milestones: savedMilestones } = JSON.parse(savedData);
      setProjects(savedProjects || []);
      setMilestones(savedMilestones || []);
      if (savedProjects?.length > 0) {
        setSelectedProject(savedProjects[0].id);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, milestones }));
  }, [projects, milestones]);

  const createProject = () => {
    if (!projectForm.name.trim()) return;
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: projectForm.name,
      description: projectForm.description,
      color: projectColors[projects.length % projectColors.length]
    };
    
    setProjects([...projects, newProject]);
    setSelectedProject(newProject.id);
    setProjectForm({ name: '', description: '' });
    setShowProjectForm(false);
  };

  const createMilestone = () => {
    if (!milestoneForm.title.trim() || !selectedProject) return;
    
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: milestoneForm.title,
      description: milestoneForm.description,
      dueDate: milestoneForm.dueDate,
      status: milestoneForm.status,
      projectId: selectedProject
    };
    
    setMilestones([...milestones, newMilestone]);
    setMilestoneForm({ title: '', description: '', dueDate: '', status: 'not-started' });
    setShowMilestoneForm(false);
  };

  const updateMilestone = () => {
    if (!editingMilestone || !milestoneForm.title.trim()) return;
    
    setMilestones(milestones.map(m => 
      m.id === editingMilestone.id 
        ? { ...m, ...milestoneForm }
        : m
    ));
    setEditingMilestone(null);
    setMilestoneForm({ title: '', description: '', dueDate: '', status: 'not-started' });
  };

  const deleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const startEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description,
      dueDate: milestone.dueDate,
      status: milestone.status
    });
    setShowMilestoneForm(true);
  };

  const updateMilestoneStatus = (id: string, status: Milestone['status']) => {
    setMilestones(milestones.map(m => 
      m.id === id ? { ...m, status } : m
    ));
  };

  const currentProject = projects.find(p => p.id === selectedProject);
  const currentMilestones = milestones.filter(m => m.projectId === selectedProject);
  const sortedMilestones = [...currentMilestones].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const getProgress = () => {
    if (currentMilestones.length === 0) return 0;
    const completed = currentMilestones.filter(m => m.status === 'completed').length;
    return Math.round((completed / currentMilestones.length) * 100);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && dueDate !== '';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const onDragStart = (e: React.DragEvent, milestone: Milestone) => {
    e.dataTransfer.setData('text/plain', milestone.id);
    e.currentTarget.classList.add('dragging');
  };

  const onDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const onDrop = (e: React.DragEvent, status: Milestone['status']) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const milestoneId = e.dataTransfer.getData('text/plain');
    updateMilestoneStatus(milestoneId, status);
  };

  const renderKanbanBoard = () => {
    const columns = [
      { status: 'not-started' as const, title: 'Not Started', className: 'kanban-not-started' },
      { status: 'in-progress' as const, title: 'In Progress', className: 'kanban-in-progress' },
      { status: 'completed' as const, title: 'Completed', className: 'kanban-completed' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => {
          const columnMilestones = currentMilestones.filter(m => m.status === column.status);
          
          return (
            <div
              key={column.status}
              className={`${column.className} rounded-xl p-4 min-h-[500px] transition-all`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, column.status)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700">{column.title}</h3>
                <span className="bg-white/50 text-gray-600 text-sm px-2 py-1 rounded-full">
                  {columnMilestones.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {columnMilestones.map(milestone => {
                  const StatusIcon = statusIcons[milestone.status];
                  
                  return (
                    <div
                      key={milestone.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, milestone)}
                      onDragEnd={onDragEnd}
                      className="glass-card rounded-lg p-4 cursor-move hover:shadow-lg transition-all animate-scale-in group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-800 group-hover:text-purple-600 transition-colors">
                          {milestone.title}
                        </h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditMilestone(milestone)}
                            className="p-1 hover:bg-purple-100 rounded text-purple-600"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => deleteMilestone(milestone.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {milestone.description && (
                        <p className="text-sm text-gray-600 mb-3">{milestone.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className="text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {formatDate(milestone.dueDate)}
                          </span>
                        </div>
                        
                        {isOverdue(milestone.dueDate) && milestone.status !== 'completed' && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeline = () => (
    <div className="space-y-6">
      {sortedMilestones.map((milestone, index) => {
        const StatusIcon = statusIcons[milestone.status];
        
        return (
          <div key={milestone.id} className="timeline-item flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColors[milestone.status]} shadow-lg`}>
                <StatusIcon size={20} />
              </div>
              {index < sortedMilestones.length - 1 && (
                <div className="w-0.5 h-16 bg-gradient-to-b from-purple-300 to-pink-300 mt-2"></div>
              )}
            </div>
            
            <div className="flex-1 glass-card rounded-xl p-6 group hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
                    {milestone.title}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Calendar size={14} />
                    {formatDate(milestone.dueDate)}
                    {isOverdue(milestone.dueDate) && milestone.status !== 'completed' && (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs ml-2">
                        Overdue
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditMilestone(milestone)}
                    className="p-2 hover:bg-purple-100 rounded-lg text-purple-600 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => deleteMilestone(milestone.id)}
                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {milestone.description && (
                <p className="text-gray-600 mb-4">{milestone.description}</p>
              )}
              
              <div className="flex gap-2">
                {(['not-started', 'in-progress', 'completed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => updateMilestoneStatus(milestone.id, status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      milestone.status === status 
                        ? statusColors[status] 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass-effect rounded-2xl p-6 mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                🚀 Roadmap Manager
              </h1>
              <p className="text-white/80">
                Create, track, and visualize your project milestones
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode(viewMode === 'timeline' ? 'kanban' : 'timeline')}
                className="glass-effect px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-all flex items-center gap-2"
              >
                {viewMode === 'timeline' ? <LayoutGrid size={18} /> : <List size={18} />}
                {viewMode === 'timeline' ? 'Kanban' : 'Timeline'}
              </button>
              
              <button
                onClick={() => setShowProjectForm(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        {projects.length > 0 && (
          <div className="glass-card rounded-xl p-6 mb-8 animate-slide-in-right">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="bg-white/50 border border-white/30 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                
                {currentProject && (
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${currentProject.color}`}></div>
                    <div>
                      <p className="font-medium text-gray-800">{currentProject.name}</p>
                      {currentProject.description && (
                        <p className="text-sm text-gray-600">{currentProject.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-600">Progress</p>
                  <p className="text-2xl font-bold gradient-text">{getProgress()}%</p>
                </div>
                
                <button
                  onClick={() => setShowMilestoneForm(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Milestone
                </button>
              </div>
            </div>
            
            {currentMilestones.length > 0 && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${getProgress()}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        {projects.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center animate-scale-in">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Roadmap Manager!</h2>
            <p className="text-gray-600 mb-6">Create your first project to start tracking milestones</p>
            <button
              onClick={() => setShowProjectForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Create Your First Project
            </button>
          </div>
        ) : currentMilestones.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center animate-scale-in">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No milestones yet</h2>
            <p className="text-gray-600 mb-6">Add your first milestone to get started</p>
            <button
              onClick={() => setShowMilestoneForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Add First Milestone
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            {viewMode === 'timeline' ? renderTimeline() : renderKanbanBoard()}
          </div>
        )}

        {/* Project Form Modal */}
        {showProjectForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-card rounded-xl p-6 w-full max-w-md animate-scale-in">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter project name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Describe your project"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowProjectForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createProject}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Form Modal */}
        {showMilestoneForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-card rounded-xl p-6 w-full max-w-md animate-scale-in">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter milestone title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Describe this milestone"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as Milestone['status'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setEditingMilestone(null);
                    setMilestoneForm({ title: '', description: '', dueDate: '', status: 'not-started' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingMilestone ? updateMilestone : createMilestone}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all"
                >
                  {editingMilestone ? 'Update' : 'Add'} Milestone
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;