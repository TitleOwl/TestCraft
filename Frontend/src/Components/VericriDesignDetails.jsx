import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPalette, faClipboardCheck } from '@fortawesome/free-solid-svg-icons';
// ตรวจสอบว่า path ถูกต้อง และอย่าลืมอัปเดต CSS file ให้ตรงกับ class name ใหม่!
import './CSS/VericriDesignDetails.css';

// Helper function for formatting date/time strings
const formatDate = (dateString) => {
    if (!dateString) return 'N/A'; // Handle null or undefined dates
    try {
        const date = new Date(dateString);
        // Check if date is valid after parsing
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleString('th-TH', { // ใช้ localeString สำหรับ date และ time
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit', // Optional: include seconds
            hour12: false // Use 24-hour format
        });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return 'Invalid Date'; // Return error string if Date constructor fails
    }
};


const VericriDesignDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get('project_id');
    const designId = queryParams.get('design_id'); // ID ของ design ที่จะแสดงรายละเอียด

    const [designData, setDesignData] = useState(null); // State เก็บข้อมูล design ชิ้นเดียว + ข้อมูล join
    const [projectDesignCriteria, setProjectDesignCriteria] = useState([]); // State เก็บข้อมูลทั้งหมดของ project
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [infoMessage, setInfoMessage] = useState(null); // State สำหรับข้อความ info (เช่น หา design id ไม่เจอ)

    useEffect(() => {
        if (projectId) {
            const fetchProjectData = async () => {
                setLoading(true);
                setError(null);
                setInfoMessage(null); // Clear previous info messages
                setDesignData(null);
                setProjectDesignCriteria([]);

                try {
                    // ดึงข้อมูล vericri_design ทั้งหมดสำหรับ project_id นี้ (รวมข้อมูล join)
                    const response = await axios.get('http://localhost:3001/vericri_design', {
                        // ใช้ URL ของ backend API ที่ถูกต้อง
                        params: { project_id: projectId },
                    });

                    const allCriteria = response.data || [];
                    setProjectDesignCriteria(allCriteria); // เก็บข้อมูลทั้งหมดของโปรเจกต์

                    // ค้นหาข้อมูล design ที่ต้องการแสดงรายละเอียด (ถ้ามี designId ส่งมา)
                    if (designId) {
                        const specificDesign = allCriteria.find(item => item.design_id === parseInt(designId, 10));

                        if (specificDesign) {
                            setDesignData(specificDesign); // ตั้งค่าข้อมูลที่จะแสดงรายละเอียด
                        } else {
                            // หากไม่พบ design_id ที่ระบุในข้อมูลที่ดึงมา
                            setInfoMessage(`Details for Design ID ${designId} not found within Project ID ${projectId}. Displaying project summary only.`);
                            console.warn(`Design ID ${designId} not found for Project ID ${projectId}`);
                            setDesignData(null); // ไม่ set design data
                        }
                    } else {
                        // กรณีไม่มี designId ส่งมาใน URL
                        setInfoMessage("No specific Design ID provided. Displaying project summary.");
                        setDesignData(null); // ไม่ต้องแสดงรายละเอียดเฉพาะ
                    }

                } catch (err) {
                    console.error('Error fetching vericri_design data for project:', err);
                    const errorMsg = err.response?.data?.error || err.message || 'An error occurred while fetching project data.';
                    setError(errorMsg);
                    setProjectDesignCriteria([]);
                    setDesignData(null);
                } finally {
                    setLoading(false);
                }
            };

            fetchProjectData();
        } else {
            setError('Required parameter (project_id) is missing in URL.');
            setLoading(false);
        }
    }, [projectId, designId]); // Rerun effect if projectId or designId changes

    const navigateBack = () => {
        // Adjust the path as needed, e.g., back to the project overview or VeriVaView
        navigate(`/ViewDesign?project_id=${projectId}`);
    };

    // --- คำนวณจำนวน designcri_name โดยใช้ useMemo ---
    const criteriaCounts = useMemo(() => {
        if (!projectDesignCriteria || projectDesignCriteria.length === 0) {
            return [];
        }
        const counts = projectDesignCriteria.reduce((acc, item) => {
            const name = item.designcri_name;
            if (name) { // Ensure name exists
                 acc[name] = (acc[name] || 0) + 1;
            }
            return acc;
        }, {});
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
    }, [projectDesignCriteria]);

    // ----- Render Logic -----

    if (loading) {
        return <div className="vericri-design-details-loading-message">Loading Project Design Data...</div>;
    }

    // แสดง Error หลัก หากการดึงข้อมูลโปรเจกต์ล้มเหลว
     if (error) {
         return (
             <div className="vericri-design-details-container">
                  <div className="vericri-design-details-header">
                       {/* Allow back navigation even on error */}
                       <button className="vericri-design-details-back-btn" onClick={navigateBack}>
                           <FontAwesomeIcon icon={faArrowLeft} /> Back
                       </button>
                       <h1 className="vericri-design-details-title">
                           <FontAwesomeIcon icon={faPalette} className="vericri-design-details-title-icon" />
                           Design Details
                       </h1>
                  </div>
                  <div className="vericri-design-details-error-message">Error: {error}</div>
             </div>
         )
     }

    // ถ้าไม่มีข้อมูลโปรเจกต์เลย (แต่ไม่มี error)
    if (!projectDesignCriteria.length) {
         return (
             <div className="vericri-design-details-container">
                  <div className="vericri-design-details-header">
                       <button className="vericri-design-details-back-btn" onClick={navigateBack}>
                           <FontAwesomeIcon icon={faArrowLeft} /> Back
                       </button>
                       <h1 className="vericri-design-details-title">
                           <FontAwesomeIcon icon={faPalette} className="vericri-design-details-title-icon" />
                           Design Details
                       </h1>
                  </div>
                  <div className="vericri-design-details-info-message">No design criteria data found for Project ID: {projectId}.</div>
             </div>
         )
    }

    // ----- แสดงผลหลัก -----
    return (
        <div className="vericri-design-details-container">
            {/* ----- Header ----- */}
            <div className="vericri-design-details-header">
                <button className="vericri-design-details-back-btn" onClick={navigateBack}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                </button>
                <h1 className="vericri-design-details-title">
                    <FontAwesomeIcon icon={faPalette} className="vericri-design-details-title-icon" />
                    Verification Criteria Design Details
                </h1>
            </div>

            {/* แสดง Info Message (เช่น หา design id ไม่เจอ) */}
            {infoMessage && <div className="vericri-design-details-info-message">{infoMessage}</div>}

            {/* ----- ส่วนแสดงรายละเอียดของ Design ID ที่เลือก (ถ้ามี) ----- */}
            {designData && ( // Render this section only if designData is found
                <div className="vericri-design-details-section">
                    <h3>Details for Design ID: {designData.design_id}</h3>
                    <div className="vericri-design-details-field">
                        <strong>Verification Round:</strong> <span>{designData.veridesign_round !== null ? designData.veridesign_round : 'N/A'}</span>
                    </div>
                    <div className="vericri-design-details-field">
                        <strong>Verification At:</strong> <span>{formatDate(designData.veridesign_at)}</span>
                    </div>
                    <div className="vericri-design-details-field">
                        <strong>Verification By:</strong> <span>{designData.veridesign_by || 'N/A'}</span>
                    </div>
                </div>
            )}

            {/* ----- ส่วนตารางสรุปจำนวน Criteria Name ----- */}
            <div className="vericri-design-details-criteria-count-section">
                <h3>
                   <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '8px' }} />
                   SDesign Criteria
                </h3>
                {criteriaCounts.length > 0 ? (
                    <table className="vericri-design-details-criteria-count-table">
                        <tbody>
                            {criteriaCounts.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.name}</td>
                                    {/* Removed Count cell based on structure in prompt */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>No design criteria names found to summarize in this project.</p>
                )}
            </div>
        </div>
    );
};

export default VericriDesignDetails;