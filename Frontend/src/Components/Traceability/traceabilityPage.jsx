import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/traceabilityPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons";
import createvervar from "./image/createvervar.png";

const TraceabilityPage = () => {
    const [traceabilityData, setTraceabilityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const designId = queryParams.get("design_id");

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) {
                setError("ไม่มี project_id ใน URL");
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get("http://localhost:3001/traceability", {
                    params: { projectId },
                });
                setTraceabilityData(response.data);
                setLoading(false);
            } catch (err) {
                setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    if (loading) return <div className="loading">กำลังโหลด...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="traceability-container">
            <button className='verify-trace' onClick={() => navigate(`/createVerifyTrace?project_id=${projectId}`)}> <img src={createvervar} alt="createver" className="createver" />Create Verification</button>
            <h1 className="traceability-title">Traceability Record</h1>
            <table className="traceability-table">
                <thead>
                    <tr>
                        <th>Requirement ID</th>
                        <th>Design ID</th>
                        <th>Code Component ID</th>
                        <th>Test Case ID</th>
                    </tr>
                </thead>
                <tbody>
                    {traceabilityData.map((item, index) => {
                        const designIDs = item.DesignIDs ? item.DesignIDs.split(',') : [];
                        const implementIDs = item.ImplementIDs ? item.ImplementIDs.split(',') : [];
                        const testCaseIDs = item.TestCaseIDs ? item.TestCaseIDs.split(',') : [];
                        const rowSpan = designIDs.length;

                        return designIDs.map((designID, idx) => (
                            <tr key={`${index}-${idx}`}>
                                {idx === 0 && (
                                    <td rowSpan={rowSpan} className="requirement-cell">
                                        <div className="reqid-trace" onClick={() => navigate(`/viewReqTrace?requirement_id=${item.RequirementID}`)} style={{ cursor: 'pointer' }}>{`REQ-${item.RequirementID}`}</div>
                                        <div className="reqname-trace">{`REQ-NAME : ${item.RequirementName}`}</div>
                                        <div className="req-allbutton-trace">
                                            <button className="button-req-trace" onClick={() => navigate(`/viewReqTrace?requirement_id=${item.RequirementID}`)}>
                                                <FontAwesomeIcon icon={faEye} className="view-req-trace" />
                                            </button>
                                            <button className="button-req-trace" onClick={() => navigate(`/editReqTrace?requirement_id=${item.RequirementID}&project_id=${projectId}`)}>
                                                <FontAwesomeIcon icon={faPen} className="edit-req-trace" />
                                            </button>
                                        </div>
                                    </td>

                                )}
                                <td>{`DE-${designID}`}
                                    {/* <div className="reqid-trace" onClick={() => navigate(`/viewReqTrace?requirement_id=${item.DiagramNames}`)} style={{ cursor: 'pointer' }}>{`REQ-${item.RequirementID}`}</div> */}
                                    <div className="reqname-trace">{`DESIGN-NAME : ${item.DiagramNames}`}</div>
                                    <div className="req-allbutton-trace">
                                        <button className="design-action-btn view" onClick={() => navigate(`/viewDesignTrace?project_id=${projectId}&design_id=${designID}`)}>
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                        <button className="button-req-trace" onClick={() => navigate(`/editReqTrace?requirement_id=${item.RequirementID}&project_id=${projectId}`)}>
                                            <FontAwesomeIcon icon={faPen} className="edit-req-trace" />
                                        </button>
                                    </div>
                                </td>
                                <td>{`IMP-${implementIDs[idx]}`}</td>
                                <td>{`TC-${testCaseIDs[idx]}`}</td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>
        </div >
    );
};

export default TraceabilityPage;