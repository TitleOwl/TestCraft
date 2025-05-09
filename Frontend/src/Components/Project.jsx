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
  faClipboardList,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { Modal, Button } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './CSS/Project.css'; // Make sure to update this CSS file too!

const Project = () => {
  const [projectList, setProjectList] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Renamed for clarity
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null); // For Details Modal
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
      filtered = filtered.filter((project) => new Date(project.end_date) >= today && project.project_status !== 'CLOSE'); // Adjusted active logic slightly
    } else if (dateFilter === 'Expired') {
      // Consider Expired to also mean projects that are closed
      filtered = filtered.filter((project) => new Date(project.end_date) < today || project.project_status === 'CLOSE');
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
        // Handle potential null or undefined values if necessary
        if (valueA > valueB) return 1;
        if (valueA < valueB) return -1;
        return 0;
      } else {
        if (valueA < valueB) return 1;
        if (valueA > valueB) return -1;
        return 0;
      }
    });

    setFilteredProjects(filtered);
  }, [searchQuery, projectList, statusFilter, dateFilter, sortBy, sortDirection]);


  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('All');
    setDateFilter('All');
    setSortBy('start_date'); // Reset sort as well? Optional.
    setSortDirection('desc');
  };

  // Update project
  const handleUpdateProject = (id) => {
    navigate(`/UpdateProject/${id}`);
  };

  // Show delete confirmation modal
  const handleDeleteConfirmation = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true); // Use specific state setter
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await axios.delete(`http://localhost:3001/project/${projectToDelete.project_id}`);
      const updatedProjectList = projectList.filter((project) => project.project_id !== projectToDelete.project_id);
      // Recalculate based on the *new* list
      setProjectList(updatedProjectList);
      // setFilteredProjects(updatedProjectList); // Let the filter useEffect handle this
      setShowDeleteModal(false); // Use specific state setter
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

      alert(`Delete Project "${projectToDelete.project_name}" Success`); // Consider using Toastify for consistency
    } catch (err) {
      alert(`Error deleting project: ${err.message}`); // Consider using Toastify
    }
  };

  // Calculate remaining days for the project
  const calculateDaysRemaining = (endDate, status) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to start of day
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0); // Normalize end date to start of day

    if (status === 'CLOSE') {
      return { value: 0, label: 'Completed', status: 'completed' };
    }

    const difference = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (difference < 0) {
      return { value: difference, label: 'Expired', status: 'expired' };
    } else if (difference === 0) {
      return { value: difference, label: 'Ends Today', status: 'warning' };
    } else if (difference <= 7) {
      return { value: difference, label: `${difference} day${difference > 1 ? 's' : ''}`, status: 'warning' };
    } else {
      return { value: difference, label: `${difference} days`, status: 'normal' };
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
      setSortDirection('asc'); // Default to ascending when changing field
    }
  };

  // Get sort indicator
  const getSortIndicator = (field) => {
    if (sortBy === field) {
      return <FontAwesomeIcon icon={faSortDown} className={`sort-indicator ${sortDirection === 'desc' ? 'desc' : 'asc'}`} />;
    }
    // Optional: add a subtle indicator for sortable but not sorted columns
    // return <FontAwesomeIcon icon={faSort} className="sort-indicator-default" />;
    return null;
  };


  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'CLOSE':
        return <FontAwesomeIcon icon={faCheckCircle} className="status-icon-project status-completed" title="Completed" />;
      case 'IN PROGRESS':
        return <FontAwesomeIcon icon={faSpinner} className="status-icon-project status-inprogress" title="In Progress" />;
      case 'DELAYED':
        return <FontAwesomeIcon icon={faExclamationTriangle} className="status-icon-project status-delayed" title="Delayed" />;
      case 'PENDING':
        return <FontAwesomeIcon icon={faClock} className="status-icon-project status-pending" title="Pending" />;
      default:
        return null; // Or a default icon like faClipboardList
    }
  };

  // Format Date Helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Example: Thai locale, short date style
    return new Date(dateString).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
        {/* ... Header content remains the same ... */}
        <div className="enterprise-title-section">
          <h1 className="enterprise-page-title">
            <FontAwesomeIcon icon={faClipboardList} className="enterprise-page-icon" />
            Project Dashboard
          </h1>
          <p className="enterprise-page-subtitle">Manage Implementation Work Products</p>
        </div>

        <div className="enterprise-actions">
          <button onClick={() => navigate('/CreateProject')} className="enterprise-btn enterprise-btn-primary">
            <FontAwesomeIcon icon={faPlus} /> New Project
          </button>
        </div>
      </div>

      <div className="enterprise-stats-cards">
        {/* ... Stats cards remain the same ... */}
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
        {/* ... Search and Filter controls remain the same ... */}
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
                aria-label="Clear search"
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
            aria-expanded={showFilters}
            aria-controls="project-filters-dropdown"
          >
            <FontAwesomeIcon icon={faFilter} />
            <span>Filters</span>
            {(statusFilter !== 'All' || dateFilter !== 'All') &&
              <span className="enterprise-filter-badge">Active</span>
            }
          </button>

          {showFilters && (
            <div className="enterprise-filter-dropdown" id="project-filters-dropdown">
              <div className="enterprise-filter-dropdown-header">
                <h4>Filter Projects</h4>
                <button
                  className="enterprise-filter-dropdown-close"
                  onClick={() => setShowFilters(false)}
                  aria-label="Close filters"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <div className="enterprise-filter-group">
                <label className="enterprise-filter-label">Project Status</label>
                <div className="enterprise-filter-options">
                  {['All', 'IN PROGRESS', 'DELAYED', 'CLOSE'].map(status => (
                    <button
                      key={status}
                      className={`enterprise-filter-option ${statusFilter === status ? 'active' : ''}`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === 'CLOSE' ? 'Completed' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="enterprise-filter-group">
                <label className="enterprise-filter-label">Timeline</label>
                <div className="enterprise-filter-options">
                  {[
                    { value: 'All', label: 'All Time' },
                    { value: 'Active', label: 'Active' },
                    { value: 'Last30Days', label: 'Started Last 30 Days' },
                    { value: 'Next30Days', label: 'Ending Next 30 Days' },
                    { value: 'Expired', label: 'Expired/Completed' }
                  ].map(filter => (
                    <button
                      key={filter.value}
                      className={`enterprise-filter-option ${dateFilter === filter.value ? 'active' : ''}`}
                      onClick={() => setDateFilter(filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
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
                {/* Apply button might not be needed if filters apply instantly via useEffect */}
                <button
                  className="enterprise-btn enterprise-btn-secondary"
                  onClick={() => setShowFilters(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ... Active Filters display remains the same ... */}
      {(statusFilter !== 'All' || dateFilter !== 'All') && (
        <div className="enterprise-active-filters">
          <div className="enterprise-active-filters-header">
            <FontAwesomeIcon icon={faFilter} className="enterprise-active-filters-icon" />
            <span>Active Filters:</span>
          </div>

          <div className="enterprise-active-filters-tags">
            {statusFilter !== 'All' && (
              <div className="enterprise-filter-tag">
                Status: {statusFilter === 'CLOSE' ? 'Completed' : statusFilter}
                <button className="enterprise-filter-tag-remove" onClick={() => setStatusFilter('All')} aria-label={`Remove filter Status: ${statusFilter}`}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}

            {dateFilter !== 'All' && (
              <div className="enterprise-filter-tag">
                Timeline: {
                  dateFilter === 'Active' ? 'Active' :
                    dateFilter === 'Expired' ? 'Expired/Completed' :
                      dateFilter === 'Last30Days' ? 'Started Last 30 Days' :
                        dateFilter === 'Next30Days' ? 'Ending Next 30 Days' :
                          'All Time' // Fallback, though shouldn't be needed here
                }
                <button className="enterprise-filter-tag-remove" onClick={() => setDateFilter('All')} aria-label={`Remove filter Timeline: ${dateFilter}`}>
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
        {/* ... Loading state remains the same ... */}
        {loading ? (
          <div className="enterprise-loading">
            <FontAwesomeIcon icon={faSpinner} className="enterprise-loading-icon fa-spin" />
            <p>Loading projects...</p>
          </div>
        ) : (
          <>
            {/* ... Table header remains the same ... */}
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
                    <th className="sortable" onClick={() => handleSort('project_name')} scope="col">
                      <div className="th-content">
                        Project Name {getSortIndicator('project_name')}
                      </div>
                    </th>
                    <th scope="col">Description</th>
                    <th className="sortable" onClick={() => handleSort('start_date')} scope="col">
                      <div className="th-content">
                        Start Date {getSortIndicator('start_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('end_date')} scope="col">
                      <div className="th-content">
                        End Date {getSortIndicator('end_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('end_date')} scope="col"> {/* Consider sorting by remaining days value? */}
                      <div className="th-content">
                        Remaining {getSortIndicator('end_date')}
                      </div>
                    </th>
                    <th className="sortable" onClick={() => handleSort('project_status')} scope="col">
                      <div className="th-content">
                        Status {getSortIndicator('project_status')}
                      </div>
                    </th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.length === 0 ? (
                    <tr>
                      {/* ... No data row remains the same ... */}
                      <td colSpan="7" className="enterprise-no-data">
                        <div className="enterprise-no-data-content">
                          <FontAwesomeIcon icon={faClipboardList} className="enterprise-no-data-icon" />
                          <p className="enterprise-no-data-text">
                            {searchQuery || statusFilter !== 'All' || dateFilter !== 'All'
                              ? 'No projects found matching your criteria'
                              : 'No projects available'}
                          </p>
                          {(statusFilter !== 'All' || dateFilter !== 'All' || searchQuery) && (
                            <button className="enterprise-btn enterprise-btn-outline" onClick={resetFilters}>
                              Reset Filters & Search
                            </button>
                          )}
                          {!(searchQuery || statusFilter !== 'All' || dateFilter !== 'All') && (
                            <button className="enterprise-btn enterprise-btn-primary" onClick={() => navigate('/CreateProject')}>
                              Create New Project
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((project) => {
                      const remainingDays = calculateDaysRemaining(project.end_date, project.project_status);

                      return (
                        <tr key={project.project_id}>
                          <td className="enterprise-project-name" data-label="Project Name">
                            {/* Make name clickable to navigate */}
                            <button
                              className="enterprise-project-link-button"
                              onClick={() => navigate(`/Dashboard?project_id=${project.project_id}`)}
                              title={`Go to dashboard for ${project.project_name}`}
                            >
                              {project.project_name}
                            </button>
                          </td>
                          <td data-label="Description">
                            <div className="enterprise-description-cell" title={project.project_description}>
                              {project.project_description?.length > 30
                                ? `${project.project_description.substring(0, 30)}...`
                                : project.project_description || '-'}
                            </div>
                          </td>
                          <td data-label="Start Date">
                            <div className="enterprise-date-cell">
                              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" aria-hidden="true" />
                              {formatDate(project.start_date)}
                            </div>
                          </td>
                          <td data-label="End Date">
                            <div className="enterprise-date-cell">
                              <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" aria-hidden="true" />
                              {formatDate(project.end_date)}
                            </div>
                          </td>
                          <td data-label="Remaining">
                            <div className={`enterprise-days-remaining enterprise-days-${remainingDays.status}`}>
                              {remainingDays.label}
                            </div>
                          </td>
                          <td data-label="Status">
                            <div className="enterprise-status-cell">
                              {getStatusIcon(project.project_status)}
                              <span className={`enterprise-status enterprise-status-${project.project_status.replace(' ', '-').toLowerCase()}`}>
                                {project.project_status === 'CLOSE' ? 'Completed' : project.project_status}
                              </span>
                            </div>
                          </td>
                          <td data-label="Actions">
                            <div className="enterprise-actions-cell">
                              <button
                                className="enterprise-action-btn enterprise-view-btn"
                                onClick={() => handleShowDetails(project)}
                                title="View Details"
                                aria-label={`View details for ${project.project_name}`}
                              >
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                              <button
                                className="enterprise-action-btn enterprise-edit-btn"
                                onClick={() => handleUpdateProject(project.project_id)}
                                title="Edit Project"
                                aria-label={`Edit project ${project.project_name}`}
                              >
                                <FontAwesomeIcon icon={faPenToSquare} />
                              </button>
                              <button
                                className="enterprise-action-btn enterprise-delete-btn"
                                onClick={() => handleDeleteConfirmation(project)}
                                title="Delete Project"
                                aria-label={`Delete project ${project.project_name}`}
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

      {/* Delete Confirmation Modal - Using specific state */}
      <Modal
        show={showDeleteModal} // Use specific state variable
        onHide={() => setShowDeleteModal(false)}
        centered
        dialogClassName="modal-dialog-centered project-modal-dialog" // UPDATED CLASS
        contentClassName="project-modal-content" // UPDATED CLASS
        className="project-modal" // UPDATED CLASS
      >
        <Modal.Header closeButton>
          <Modal.Title className="project-modal-title">Confirm Delete</Modal.Title> {/* UPDATED CLASS */}
        </Modal.Header>
        <Modal.Body>
          {projectToDelete && (
            <div className="project-modal-body-content"> {/* Optional: Wrapper for layout */}
              <div className="project-modal-icon project-modal-icon-warning"> {/* UPDATED CLASS */}
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <div className="project-modal-message"> {/* UPDATED CLASS */}
                <p>Are you sure you want to delete the project <strong>{projectToDelete.project_name}</strong>?</p>
                <p className="project-modal-warning-text">This action cannot be undone.</p> {/* UPDATED CLASS */}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="project-modal-footer"> {/* UPDATED CLASS */}
          <Button
            variant="outline-secondary"
            onClick={() => setShowDeleteModal(false)}
            className="enterprise-btn enterprise-btn-outline" // Keep general button style? Or create project-modal-btn?
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProject}
            className="enterprise-btn enterprise-btn-danger" // Keep general button style?
          >
            Delete Project
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Project Details Modal */}
      <Modal
        show={!!selectedProject}
        onHide={() => setSelectedProject(null)}
        centered
        dialogClassName="modal-dialog-centered project-modal-dialog" // UPDATED CLASS
        contentClassName="project-modal-content" // UPDATED CLASS
        className="project-modal project-modal-lg" // UPDATED CLASS (added size class)
        size="lg" // Use react-bootstrap size prop for lg modal
      >
        <Modal.Header closeButton>
          <Modal.Title className="project-modal-title">Project Details</Modal.Title> {/* UPDATED CLASS */}
        </Modal.Header>
        <Modal.Body className="project-modal-body"> {/* UPDATED CLASS */}
          {selectedProject && (
            <div className="project-details-content"> {/* Use a more specific class for inner details */}
              <div className="project-details-overview"> {/* Specific class */}
                <h4 className="project-details-name">{selectedProject.project_name}</h4> {/* Specific class */}
                <div className={`enterprise-status enterprise-status-${selectedProject.project_status.replace(' ', '-').toLowerCase()}`}>
                  {getStatusIcon(selectedProject.project_status)}
                  {selectedProject.project_status === 'CLOSE' ? 'Completed' : selectedProject.project_status}
                </div>
              </div>

              <div className="project-details-section"> {/* Specific class */}
                <h5 className="project-details-section-title">Description</h5> {/* Specific class */}
                <p className="project-details-description">{selectedProject.project_description || 'No description provided.'}</p> {/* Specific class */}
              </div>

              <div className="project-details-timeline"> {/* Specific class */}
                <div className="project-details-date"> {/* Specific class */}
                  <div className="project-details-date-label">Start Date</div> {/* Specific class */}
                  <div className="project-details-date-value"> {/* Specific class */}
                    <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" /> {/* Keep existing icon class? */}
                    {formatDate(selectedProject.start_date)}
                  </div>
                </div>
                <div className="project-details-timeline-divider"></div> {/* Specific class */}
                <div className="project-details-date"> {/* Specific class */}
                  <div className="project-details-date-label">End Date</div> {/* Specific class */}
                  <div className="project-details-date-value"> {/* Specific class */}
                    <FontAwesomeIcon icon={faCalendarAlt} className="enterprise-date-icon" /> {/* Keep existing icon class? */}
                    {formatDate(selectedProject.end_date)}
                  </div>
                </div>
              </div>

              {/* Team Members Section - Already seems specific */}
              {selectedProject.project_member && (
                <div className="project-details-section"> {/* Specific class */}
                  <h5 className="project-details-section-title">Team Members</h5> {/* Specific class */}
                  {(() => { // IIFE to handle parsing safely
                    try {
                      const members = JSON.parse(selectedProject.project_member);
                      if (Array.isArray(members) && members.length > 0) {
                        return (
                          <div className="enterprise-team-members"> {/* Keep if styled globally? Or change? */}
                            {members.map((member, index) => (
                              <div key={index} className="enterprise-team-member">
                                <div className="enterprise-member-avatar" title={member.name}>
                                  {member.name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="enterprise-member-info">
                                  <div className="enterprise-member-name">{member.name || 'Unnamed Member'}</div>
                                  {member.roles && Array.isArray(member.roles) && (
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
                        );
                      } else {
                        return <p className="enterprise-no-members">No team members assigned</p>; // Keep or change?
                      }
                    } catch (e) {
                      console.error("Error parsing project members:", e);
                      return <p className="enterprise-no-members">Error loading team members</p>; // Keep or change?
                    }
                  })()}
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="project-modal-footer"> {/* UPDATED CLASS */}
          <Button
            variant="outline-secondary"
            onClick={() => setSelectedProject(null)}
            className="enterprise-btn enterprise-btn-outline" // Keep general button style?
          >
            Close
          </Button>
          {selectedProject && (
            <Button
              variant="primary"
              onClick={() => {
                const id = selectedProject.project_id; // Capture id before clearing state
                setSelectedProject(null);
                navigate(`/UpdateProject/${id}`);
              }}
              className="enterprise-btn enterprise-btn-primary" // Keep general button style?
            >
              Edit Project
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Removed the duplicate Delete Confirmation Modal structure */}

    </div>
  );
};

export default Project;