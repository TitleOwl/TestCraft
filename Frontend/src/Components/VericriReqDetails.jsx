import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import './CSS/VericriReqDetails.css'; // Make sure this CSS file exists and is styled appropriately

const VericriReqDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('project_id');
    const requirementId = queryParams.get('requirement_id');
    const [vericriReqData, setVericriReqData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId && requirementId) {
            const fetchVericriReqData = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await axios.get('http://localhost:3001/vericri_req', {
                        params: { project_id: projectId, requirement_id: requirementId },
                    });
                    // Sorting by verification_at first helps ensure consistency
                    // in which record (e.g., the earliest) is kept after filtering duplicates.
                    const sortedData = response.data.sort((a, b) =>
                        new Date(a.verification_at) - new Date(b.verification_at)
                    );
                    setVericriReqData(sortedData);
                } catch (error) {
                    console.error('Error fetching vericri_req data:', error);
                    setError(error.response?.data?.message || error.message || 'Failed to fetch data');
                } finally {
                    setLoading(false);
                }
            };
            fetchVericriReqData();
        } else {
            console.error('Missing project_id or requirement_id in URL query parameters');
            setError('Missing project ID or requirement ID');
            setLoading(false);
        }
    }, [projectId, requirementId]);

    // --- UPDATED useMemo ---
    // Now filters for uniqueness based ONLY on reqcri_name and verification_by
    const uniqueVericriReqData = useMemo(() => {
        if (!vericriReqData) return [];
        return vericriReqData.filter((item, index, self) =>
            index === self.findIndex((t) =>
                // Compare only the fields that are currently displayed to define uniqueness
                t.reqcri_name === item.reqcri_name &&
                t.verification_by === item.verification_by
                // Removed the check for verification_at: && t.verification_at === item.verification_at
            )
        );
    }, [vericriReqData]);
    // --- END UPDATED useMemo ---

    const navigateBack = () => {
        navigate(-1);
    };

    // ... (Render Loading State, Error State, No Data State remain the same) ...
        // --- Render Loading State ---
        if (loading) {
            return (
                <div className="verification-req-details-container loading-message">
                     <FontAwesomeIcon icon={faClipboardList} spin /> Loading Details...
                </div>
            );
        }

        // --- Render Error State ---
        if (error) {
            return (
                <div className="verification-req-details-container error-message">
                    <div className="verification-req-header">
                         <button className="verification-req-back-btn" onClick={navigateBack}>
                             <FontAwesomeIcon icon={faArrowLeft} /> Back
                         </button>
                         <h1 className="verification-req-title">
                             <FontAwesomeIcon icon={faClipboardList} className="verification-req-title-icon" />
                             Error
                         </h1>
                    </div>
                    <p>Could not load verification details: {error}</p>
                </div>
            );
        }

        // --- Render No Data State ---
        if (!uniqueVericriReqData || uniqueVericriReqData.length === 0) {
           return (
            <div className="verification-req-details-container">
                <div className="verification-req-header">
                     <button className="verification-req-back-btn" onClick={navigateBack}>
                         <FontAwesomeIcon icon={faArrowLeft} /> Back
                     </button>
                     <h1 className="verification-req-title">
                         <FontAwesomeIcon icon={faClipboardList} className="verification-req-title-icon" />
                         Verification Criteria Requirements Details
                     </h1>
                   </div>
                   <h2 className="requirement-id-header">Requirement ID: {requirementId || 'N/A'}</h2>
                   <p className="no-data-message">No unique verification criteria details found for this requirement.</p>
            </div>
           );
        }

    // --- Render Main Content (Table with Data) ---
    return (
        <div className="verification-req-details-container">
            {/* Header Section */}
            <div className="verification-req-header">
                 <button className="verification-req-back-btn" onClick={navigateBack}>
                     <FontAwesomeIcon icon={faArrowLeft} /> Back
                 </button>
                 <h1 className="verification-req-title">
                     <FontAwesomeIcon icon={faClipboardList} className="verification-req-title-icon" />
                     Verification Criteria Requirements Details
                 </h1>
            </div>

            {/* Display Requirement ID */}
            <h2 className="requirement-id-header">Requirement ID: {requirementId}</h2>

            {/* Table Section */}
            <div className="verification-req-table-container">
                <table className="verification-req-table">
                    <thead>
                        <tr>
                            <th className="row-number-header">#</th>
                            <th>Criteria Name</th>
                            <th>Verification By</th>
                            {/* Verification At header is already removed */}
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueVericriReqData.map((item, index) => (
                            // Key generation can be simplified now, or kept robust using original fields if needed.
                            // Using index combined with displayed fields is usually safe after filtering.
                            <tr key={`${item.reqcri_name}-${item.verification_by}-${index}`}>
                                <td className="row-number-cell">{index + 1}</td>
                                <td className="criteria-name-cell">
                                    {typeof item.reqcri_name === 'string' ? (
                                        item.reqcri_name.split(',').map((part, partIndex) => (
                                            <div key={partIndex} style={{ marginBottom: '5px' }}>
                                                {part.trim()}
                                            </div>
                                        ))
                                    ) : (
                                        'N/A'
                                    )}
                                </td>
                                <td className="verification-by-cell">
                                  {(() => {
                                    const rawValue = item.verification_by;
                                    if (typeof rawValue === 'string' && rawValue.startsWith('[') && rawValue.endsWith(']')) {
                                      try {
                                        const parsedArray = JSON.parse(rawValue);
                                        if (Array.isArray(parsedArray)) {
                                          const names = parsedArray.map(entry => {
                                            if (typeof entry === 'string') {
                                              const namePart = entry.split(':')[0].trim();
                                              if (namePart.startsWith('"') && namePart.endsWith('"')) {
                                                   return namePart.substring(1, namePart.length - 1);
                                              }
                                              return namePart;
                                            }
                                            return null;
                                          }).filter(name => name);
                                          if (names.length > 0) {
                                            return names.join(', ');
                                          }
                                        }
                                      } catch (e) {
                                        console.error("Error parsing verification_by JSON or processing names:", e, rawValue);
                                        if (rawValue.length > 2) {
                                            return rawValue.substring(1, rawValue.length - 1);
                                        }
                                        return rawValue;
                                      }
                                    }
                                    return rawValue || 'N/A';
                                  })()}
                                </td>
                                {/* Verification At cell is already removed */}
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="item-count-footer">
                    Showing {uniqueVericriReqData.length} unique record(s) based on Criteria Name and Verification By.
                </p>
            </div>
        </div>
    );
};

export default VericriReqDetails;