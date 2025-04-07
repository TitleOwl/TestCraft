import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import './CSS/VericriReqDetails.css';

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
                try {
                    const response = await axios.get('http://localhost:3001/vericri_req', {
                        params: { project_id: projectId, requirement_id: requirementId },
                    });
                    setVericriReqData(response.data);
                    setLoading(false);
                } catch (error) {
                    console.error('Error fetching vericri_req data:', error);
                    setError(error.message);
                    setLoading(false);
                }
            };

            fetchVericriReqData();
        } else {
            console.error('Missing project_id or requirement_id');
            setError('Missing project_id or requirement_id');
            setLoading(false);
        }
    }, [projectId, requirementId]);

    const navigateBack = () => {
        navigate(`/VeriVaView?project_id=${projectId}`);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    // จัดกลุ่มข้อมูลตาม requirement_id
    const groupedData = vericriReqData.reduce((acc, item) => {
        if (!acc[item.requirement_id]) {
            acc[item.requirement_id] = {
                requirement_id: item.requirement_id,
                verification_by: item.verification_by,
                verification_at: item.verification_at,
            };
        }
        return acc;
    }, {});

    const uniqueData = Object.values(groupedData); // แปลง Object เป็น Array เพื่อให้วนลูปง่าย

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

        {uniqueData.map((item, index) => (
            <div key={index} className="verification-req-section">
                <h2>Requirement ID: {item.requirement_id}</h2>
                <h3>Verification By: {item.verification_by}</h3>
                <h3>Verification At: {formatDate(item.verification_at)}</h3>
            </div>
        ))}

        <div className="verification-req-table-container">
            <table className="verification-req-table">
                <thead>
                    <tr>
                        <th>Criteria Name</th>
                    </tr>
                </thead>
                <tbody>
                    {vericriReqData.map((item, index) => (
                        <tr key={index}>
                            <td>{item.reqcri_name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);
};

export default VericriReqDetails;