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

    // ... (useEffect, useMemo, navigateBack, formatDate functions remain the same) ...
    useEffect(() => {
        if (projectId && requirementId) {
            const fetchVericriReqData = async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await axios.get('http://localhost:3001/vericri_req', {
                        params: { project_id: projectId, requirement_id: requirementId },
                    });
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

    const uniqueVericriReqData = useMemo(() => {
        if (!vericriReqData) return [];
        return vericriReqData.filter((item, index, self) =>
            index === self.findIndex((t) =>
                t.reqcri_name === item.reqcri_name &&
                t.verification_by === item.verification_by &&
                t.verification_at === item.verification_at
            )
        );
    }, [vericriReqData]);

    const navigateBack = () => {
        navigate(-1);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
              return 'Invalid Date';
            }
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
    };


    // --- Render Loading State ---
    if (loading) {
        // ... (loading JSX same as before) ...
         return (
            <div className="verification-req-details-container loading-message">
                 <FontAwesomeIcon icon={faClipboardList} spin /> Loading Details...
            </div>
        );
    }

    // --- Render Error State ---
    if (error) {
        // ... (error JSX same as before) ...
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
      // ... (no data JSX same as before) ...
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
                {/* ... (Header content same as before) ... */}
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
                            {/* ----- เพิ่มคอลัมน์ลำดับ ----- */}
                            <th className="row-number-header">#</th>
                            {/* -------------------------- */}
                            <th>Criteria Name</th>
                            <th>Verification By</th>
                            <th>Verification At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueVericriReqData.map((item, index) => (
                            <tr key={item.verification_at ? `${item.reqcri_name}-${item.verification_at}-${index}` : index}>
                                {/* ----- เพิ่ม Cell แสดงเลขลำดับ ----- */}
                                <td className="row-number-cell">{index + 1}</td>
                                {/* -------------------------------- */}
                                {/* Criteria Name Cell */}
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
                                {/* Verification By Cell */}
                                <td className="verification-by-cell">
                                    {item.verification_by || 'N/A'}
                                </td>
                                {/* Verification At Cell */}
                                <td className="verification-at-cell">
                                    {formatDate(item.verification_at)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Optionally, display the count */}
                <p className="item-count-footer">
                    Showing {uniqueVericriReqData.length} unique record(s).
                </p>
            </div>
        </div>
    );
};

export default VericriReqDetails;