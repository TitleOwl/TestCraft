import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMagnifyingGlass, 
  faPenToSquare, 
  faTrash, 
  faEye, 
  faPlus, 
  faFilter, 
  faCalendarAlt, 
  faCheckCircle,
  faSpinner,
  faExclamationTriangle,
  faArrowsRotate,
  faSortDown,
  faXmark,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import { Modal, Button } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CSS/Project.css';

const Project = () => {
  const [projectList, setProjectList] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const navigate = useNavigate();
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('start_date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Analytics data
  const [analytics, setAnalytics] = useState({
    totalProjects: 0,
    activeProjects: 0,
    delayedProjects: 0,
    completedProjects: 0
  });

  // Fetch project data when the component mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/project');
      setProjectList(response.data);
      setFilteredProjects(response.data);
      
      // Calculate analytics
      const now = new Date();
      const stats = {
        totalProjects: response.data.length,
        activeProjects: response.data.filter(p => new Date(p.end_date) >= now && p.project_status !== 'CLOSE').length,
        delayedProjects: response.data.filter(p => p.project_status === 'DELAYED').length,
        completedProjects: response.data.filter(p => p.project_status === 'CLOSE').length
      };
      setAnalytics(stats);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setLoading(false);
    }
  };

  // Apply all filters and sorting
  useEffect(() => {
    let filtered = [...projectList];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((project) =>
        project.project_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter((project) => project.project_status === statusFilter);
    }
    
    // Apply date filter
    const today = new Date();
    if (dateFilter === 'Active') {
      filtered = filtered.filter((project) => new Date(project.end_date) >= today);
    } else if (dateFilter === 'Expired') {
      filtered = filtered.filter((project) => new Date(project.end_date) < today);
    } else if (dateFilter === 'Last30Days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      filtered = filtered.filter((project) => new Date(project.start_date) >= thirtyDaysAgo);
    } else if (dateFilter === 'Next30Days') {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      filtered = filtered.filter(
        (project) => new Date(project.end_date) <= thirtyDaysLater && new Date(project.end_date) >= today
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA = a[sortBy];
      let valueB = b[sortBy];
      
      // Handle special case for date comparison
      if (sortBy === 'start_date' || sortBy === 'end_date') {
        valueA = new Date(valueA);
        valueB = new Date(valueB);
      }
      
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredProjects(filtered);
  }, [searchQuery, projectList, statusFilter, dateFilter, sortBy, sortDirection]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFilter('All');
  };

  // Update project
  const handleUpdateProject = (id) => {
    navigate(`/UpdateProject/${id}`);
  };

  // Show delete confirmation modal
  const handleDeleteConfirmation = (project) => {
    setProjectToDelete(project);
    setShowModal(true);
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await axios.delete(`http://localhost:3001/project/${projectToDelete.project_id}`);
      const updatedProjectList = projectList.filter((project) => project.project_id !== projectToDelete.project_id);
      setProjectList(updatedProjectList);
      setFilteredProjects(updatedProjectList);
      setShowModal(false);
      setProjectToDelete(null);
      
      // Update analytics after deletion
      const now = new Date();
      const stats = {
        totalProjects: updatedProjectList.length,
        activeProjects: updatedProjectList.filter(p => new Date(p.end_date) >= now && p.project_status !== 'CLOSE').length,
        delayedProjects: updatedProjectList.filter(p => p.project_status === 'DELAYED').length,
        completedProjects: updatedProjectList.filter(p => p.project_status === 'CLOSE').length
      };
      setAnalytics(stats);
      
      alert(`Delete Project "${projectToDelete.project_name}" Success`);
    } catch (err) {
      alert(`Error deleting project: ${err.message}`);
    }
  };

  // Calculate remaining days for the project
  const calculateDaysRemaining = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const difference = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    
    if (difference > 0) {
      return { value: difference, label: `${difference} days`, status: difference <= 7 ? 'warning' : 'normal' };
    } else {
      return { value: difference, label: 'Expired', status: 'expired' };
    }
  };

  // Show project details in a modal
  const handleShowDetails = (project) => {
    setSelectedProject(project);
  };

  // Handle sort change
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortBy === field) {
      return <FontAwesomeIcon icon={faSortDown} className={`sort-indicator ${sortDirection === 'desc' ? 'desc' : 'asc'}`} />;
    }
    return null;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'CLOSE':
        return <FontAwesomeIcon icon={faCheckCircle} className="status-icon status-completed" />;
      case 'IN PROGRESS':
        return <FontAwesomeIcon icon={faSpinner} className="status-icon status-inprogress" />;
      case 'DELAYED':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon status-delayed" />;
      default:
        return null;
    }
  };

  return (
    <div className="enterprise-page-container">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
      />
      
      <div className="enterprise-header">
        <div className="enterprise-title-section">
          <h1 className="enterprise-page-title">
            <FontAwesomeIcon icon={faClipboardList} className="enterprise-page-icon" />
            Project Management
          </h1>
          <p className="enterprise-page-subtitle">Manage and monitor all project activities</p>
        </div>
        
        <div className="enterprise-actions">
          <button onClick={() => navigate('/CreateProject')} className="enterprise-btn enterprise-btn-primary">
            <FontAwesomeIcon icon={faPlus} /> New Project
          </button>
          <button onClick={fetchProjects} className="enterprise-btn enterprise-btn-outline">
            <FontAwesomeIcon icon={faArrowsRotate} /> Refresh
          </button>
        </div>
      </div>
      
      <div className="enterprise-stats-cards">
        <div className="enterprise-stat-card">
          <div className="enterprise-stat-icon total">
            <FontAwesomeIcon icon={faClipboardList} />
          </div>
          <div className="enterprise-stat-content">
            <h3 className="enterprise-stat-value">{analytics.totalProjects}</h3>
            <p className="enterprise-stat-label">Total Projects</p>
          </div>
        </div>
        
        <div className="enterprise-stat-card">
          <div className="enterprise-stat-icon active">
            <FontAwesomeIcon icon={faSpinner} />
          </div>
          <div className="enterprise-stat-content">
            <h3 className="enterprise-stat-value">{analytics.activeProjects}</h3>
            <p className="enterprise-stat-label">Active Projects</p>
          </div>
        </div>
        
        <div className="enterprise-stat-card">
          <div className="enterprise-stat-icon delayed">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="enterprise-stat-content">
            <h3 className="enterprise-stat-value">{analytics.delayedProjects}</h3>
            <p className="enterprise-stat-label">Delayed Projects</p>
          </div>
        </div>
        
        <div className="enterprise-stat-card">
          <div className="enterprise-stat-icon completed">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="enterprise-stat-content">
            <h3 className="enterprise-stat-value">{analytics.completedProjects}</h3>
            <p className="enterprise-stat-label">Completed Projects</p>
          </div>
        </div>
      </div>

      <div className="enterprise-controls-container">
        <div className="enterprise-search-section">
          <div className="enterprise-search-box">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="enterprise-search-icon" />
            <input
              type="text"
              className="enterprise-search-input"
              placeholder="Search projects by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="enterprise-search-clear" 
                onClick={() => setSearchQuery('')}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            )}
          </div>
        </div>
        
        <div className="enterprise-filter-section">
          <button 
            className="enterprise-btn enterprise-btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FontAwesomeIcon icon={faFilter} /> 
            <span>Filters</span>
            {(statusFilter !== 'All' || dateFilter !== 'All') && 
              <span className="enterprise-filter-badge">Active</span>
            }
          </button>
          
          {showFilters && (
            <div className="enterprise-filter-dropdown">
              <div className="enterprise-filter-dropdown-header">
                <h4>Filter Projects</h4>
                <button 
                  className="enterprise-filter-dropdown-close"
                  onClick={() => setShowFilters(false)}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
              
              <div className="enterprise-filter-group">
                <label className="enterprise-filter-label">Project Status</label>
                <div className="enterprise-filter-options">
                  <button 
                    className={`enterprise-filter-option ${statusFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('All')}
                  >
                    All
                  </button>
                  <button 
                    className={`enterprise-filter-option ${statusFilter === 'IN PROGRESS' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('IN PROGRESS')}
                  >
                    In Progress
                  </button>
                  <button 
                    className={`enterprise-filter-option ${statusFilter === 'DELAYED' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('DELAYED')}
                  >
                    Delayed
                  </button>
                  <button 
                    className={`enterprise-filter-option ${statusFilter === 'CLOSE' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('CLOSE')}
                  >
                    Completed
                  </button>
                </div>
              </div>
              
              <div className="enterprise-filter-group">
                <label className="enterprise-filter-label">Timeline</label>
                <div className="enterprise-filter-options">
                  <button 
                    className={`enterprise-filter-option ${dateFilter === 'All' ? 'active' : ''}`}
                    onClick={() => setDateFilter('All')}
                  >
                    All Time
                  </button>
                  <button 
                    className={`enterprise-filter-option ${dateFilter === 'Active' ? 'active' : ''}`}
                    onClick={() => setDateFilter('Active')}
                  >
                    Active
                  </button>
                  <button 
                    className={`enterprise-filter-option ${dateFilter === 'Last30Days' ? 'active' : ''}`}
                    onClick={() => setDateFilter('Last30Days')}
                  >
                    Started in Last 30 Days
                  </button>
                  <button 
                    className={`enterprise-filter-option ${dateFilter === 'Next30Days' ? 'active' : ''}`}
                    onClick={() => setDateFilter('Next30Days')}
                  >
                    Ending in Next 30 Days
                  </button>
                  <button 
                    className={`enterprise-filter-option ${dateFilter === 'Expired' ? 'active' : ''}`}
                    onClick={() => setDateFilter('Expired')}
                  >
                    Expired
                  </button>
                </div>
              </div>
              
              <div className="enterprise-filter-actions">
                {(statusFilter !== 'All' || dateFilter !== 'All') && (
                  <button
                    className="enterprise-btn enterprise-btn-text"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                )}
                <button
                  className="enterprise-btn enterprise-btn-secondary"
                  onClick={() => setShowFilters(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {(statusFilter !== 'All' || dateFilter !== 'All') && (
        <div className="enterprise-active-filters">
          <div className="enterprise-active-filters-header">
            <FontAwesomeIcon icon={faFilter} className="enterprise-active-filters-icon" />
            <span>Active Filters:</span>
          </div>
          
          <div className="enterprise-active-filters-tags">
            {statusFilter !== 'All' && (
              <div className="enterprise-filter-tag">
                Status: {statusFilter}
                <button className="enterprise-filter-tag-remove" onClick={() => setStatusFilter('All')}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}
            
            {dateFilter !== 'All' && (
              <div className="enterprise-filter-tag">
                Timeline: {dateFilter === 'Active' ? 'Active Projects' : 
                          dateFilter === 'Expired' ? 'Expired Projects' : 
                          dateFilter === 'Last30Days' ? 'Started in Last 30 Days' : 
                          'Ending in Next 30 Days'}
                <button className="enterprise-filter-tag-remove" onClick={() => setDateFilter('All')}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}
          </div>
          
          <button 
            className="enterprise-btn enterprise-btn-text enterprise-active-filters-clear"
            onClick={resetFilters}
          >
            Clear All
          </button>
        </div>
      )}

      <div className="enterprise-table-container">
        {loading ? (
          <div className="enterprise-loading">
            <FontAwesomeIcon icon={faSpinner} className="enterprise-loading-icon fa-spin" />
            <p>Loading projects...</p>
          </div>
        ) : (
          <>
            <div className="enterprise-table-header">
              <h2 className="enterprise-table-title">Projects List</h2>
              <div className="enterprise-table-meta">
                Showing {filteredProjects.length} of {projectList.length} projects
              </div>
            </div>
            
            <div className="enterprise-table-responsive">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('project_name')}>
                      <div className="th-content">
                        Project Name {getSortIndicator('project_name')}
                      </div>
                    </th>
                    <th>Description</th>
                    <th className="sortable" onClick={() => handleSort('start_date')}>
                      <div className="th-content">
                        Start Date {getSortIndicator('start_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('end_date')}>
                      <div className="th-content">
                        End Date {getSortIndicator('end_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('end_date')}>
                      <div className="th-content">
                        Remaining {getSortIndicator('end_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('project_status')}>
                      <div className="th-content">
                        Status {getSortIndicator('project_status')}
                      </div>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="enterprise-no-data">
                        <div className="enterprise-no-data-content">
                          <FontAwesomeIcon icon={faClipboardList} className="enterprise-no-data-icon" />
                          <p className="enterprise-no-data-text">No projects found matching your criteria</p>
                          {(statusFilter !== 'All' || dateFilter !== 'All' || searchQuery) && (
                            <button className="enterprise-btn enterprise-btn-outline" onClick={resetFilters}>
                              Reset Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => {
                      const remainingDays = calculateDaysRemaining(project.end_date);
                      
                      return (
                        <tr key={project.project_id}>
                          <td className="enterprise-project-name" onClick={() => navigate(`/Dashboard?project_id=${project.project_id}`)}>
                            {project.project_name}
                          </td>
                          <td>
                            <div className="enterprise-description-cell">
                              {project.project_description.length > 30 
                                ? `${project.project_description.substring(0, 30)}...` 
                                : project.project_description}
                            </div>
                          </td>
                          <td>
                            <div className="enterprise-date-cell">
                              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" />
                              {new Date(project.start_date).toLocaleDateString('th-TH')}
                            </div>
                          </td>
                          <td>
                            <div className="enterprise-date-cell">
                              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" />
                              {new Date(project.end_date).toLocaleDateString('th-TH')}
                            </div>
                          </td>
                          <td>
                            <div className={`enterprise-days-remaining enterprise-days-${remainingDays.status}`}>
                              {remainingDays.label}
                            </div>
                          </td>
                          <td>
                            <div className="enterprise-status-cell">
                              {getStatusIcon(project.project_status)}
                              <span className={`enterprise-status enterprise-status-${project.project_status.replace(' ', '-').toLowerCase()}`}>
                                {project.project_status}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="enterprise-actions-cell">
                              <button 
                                className="enterprise-action-btn enterprise-view-btn" 
                                onClick={() => handleShowDetails(project)}
                                title="View Details"
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button 
                                className="enterprise-action-btn enterprise-edit-btn" 
                                onClick={() => handleUpdateProject(project.project_id)}
                                title="Edit Project"
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                              </button>
                              <button 
                                className="enterprise-action-btn enterprise-delete-btn" 
                                onClick={() => handleDeleteConfirmation(project)}
                                title="Delete Project"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        centered
        dialogClassName="modal-dialog-centered enterprise-modal-dialog"
        className="enterprise-modal"
      >
        <div className="enterprise-modal-content">
          <div className="enterprise-modal-header">
            <h5 className="enterprise-modal-title">Confirm Delete</h5>
            <button 
              className="enterprise-modal-close" 
              onClick={() => setShowModal(false)}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="enterprise-modal-body">
            {projectToDelete && (
              <>
                <div className="enterprise-modal-icon enterprise-modal-icon-warning">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <div className="enterprise-modal-message">
                  <p>Are you sure you want to delete the project <strong>{projectToDelete.project_name}</strong>?</p>
                  <p className="enterprise-modal-warning-text">This action cannot be undone.</p>
                </div>
              </>
            )}
          </div>
          <div className="enterprise-modal-footer">
            <button 
              className="enterprise-btn enterprise-btn-outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
            <button 
              className="enterprise-btn enterprise-btn-danger"
              onClick={handleDeleteProject}
            >
              Delete Project
            </button>
          </div>
        </div>
      </Modal>

      {/* Project Details Modal */}
      <Modal 
  show={!!selectedProject} 
  onHide={() => setSelectedProject(null)} 
  centered
  dialogClassName="modal-dialog-centered enterprise-modal-dialog"
  contentClassName="enterprise-modal-content"
  className="enterprise-modal enterprise-modal-lg"
>
  <Modal.Header closeButton>
    <Modal.Title className="enterprise-modal-title">Project Details</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedProject && (
      <div className="enterprise-project-details">
        <div className="enterprise-project-overview">
          <h4 className="enterprise-project-name">{selectedProject.project_name}</h4>
          <div className={`enterprise-status enterprise-status-${selectedProject.project_status.replace(' ', '-').toLowerCase()}`}>
            {getStatusIcon(selectedProject.project_status)}
            {selectedProject.project_status}
          </div>
        </div>
        
        <div className="enterprise-project-section">
          <h5 className="enterprise-section-title">Description</h5>
          <p className="enterprise-project-description">{selectedProject.project_description}</p>
        </div>
        
        <div className="enterprise-project-timeline">
          <div className="enterprise-project-date">
            <div className="enterprise-date-label">Start Date</div>
            <div className="enterprise-date-value">
              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" />
              {new Date(selectedProject.start_date).toLocaleDateString('th-TH')}
            </div>
          </div>
          <div className="enterprise-timeline-divider"></div>
          <div className="enterprise-project-date">
            <div className="enterprise-date-label">End Date</div>
            <div className="enterprise-date-value">
              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" />
              {new Date(selectedProject.end_date).toLocaleDateString('th-TH')}
            </div>
          </div>
        </div>
        
        {selectedProject.project_member && (
          <div className="enterprise-project-section">
            <h5 className="enterprise-section-title">Team Members</h5>
            {JSON.parse(selectedProject.project_member).length > 0 ? (
              <div className="enterprise-team-members">
                {JSON.parse(selectedProject.project_member).map((member, index) => (
                  <div key={index} className="enterprise-team-member">
                    <div className="enterprise-member-avatar">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="enterprise-member-info">
                      <div className="enterprise-member-name">{member.name}</div>
                      {member.roles && (
                        <div className="enterprise-member-roles">
                          {member.roles.map((role, roleIndex) => (
                            <span key={roleIndex} className="enterprise-member-role">
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="enterprise-no-members">No team members assigned</p>
            )}
          </div>
        )}
      </div>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button 
      variant="outline-secondary"
      onClick={() => setSelectedProject(null)}
      className="enterprise-btn enterprise-btn-outline"
    >
      Close
    </Button>
    {selectedProject && (
      <Button 
        variant="primary"
        onClick={() => {
          setSelectedProject(null);
          navigate(`/UpdateProject/${selectedProject.project_id}`);
        }}
        className="enterprise-btn enterprise-btn-primary"
      >
        Edit Project
      </Button>
    )}
  </Modal.Footer>
</Modal>

{/* Delete Confirmation Modal - ใช้รูปแบบเดียวกัน */}
<Modal 
  show={showModal} 
  onHide={() => setShowModal(false)} 
  centered
  dialogClassName="modal-dialog-centered enterprise-modal-dialog"
  contentClassName="enterprise-modal-content"
  className="enterprise-modal"
>
  <Modal.Header closeButton>
    <Modal.Title className="enterprise-modal-title">Confirm Delete</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {projectToDelete && (
      <>
        <div className="enterprise-modal-icon enterprise-modal-icon-warning">
          <FontAwesomeIcon icon={faExclamationTriangle} />
        </div>
        <div className="enterprise-modal-message">
          <p>Are you sure you want to delete the project <strong>{projectToDelete.project_name}</strong>?</p>
          <p className="enterprise-modal-warning-text">This action cannot be undone.</p>
        </div>
      </>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button 
      variant="outline-secondary"
      onClick={() => setShowModal(false)}
      className="enterprise-btn enterprise-btn-outline"
    >
      Cancel
    </Button>
    <Button 
      variant="danger"
      onClick={handleDeleteProject}
      className="enterprise-btn enterprise-btn-danger"
    >
      Delete Project
    </Button>
  </Modal.Footer>
</Modal>
    </div>
  );
};

export default Project;