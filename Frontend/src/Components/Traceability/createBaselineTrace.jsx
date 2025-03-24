import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/traceabilityPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen } from "@fortawesome/free-solid-svg-icons";

const CreateBaselineTrace = () => {
    const [baselineData, setBaselineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const selectedRound = queryParams.get("round");

    useEffect(() => {
        const fetchData = async () => {
            if (!projectId) {
                setError("ไม่มี project_id ใน URL");
                setLoading(false);
                return;
            }
            try {
                const response = await axios.get("http://localhost:3001/getVerificationTrace", {
                    params: { projectId },
                });

                // Group data by requirement_id
                const groupedData = response.data.data.reduce((acc, item) => {
                    const key = item.requirement_id;

                    if (!acc[key]) {
                        acc[key] = {
                            requirement_id: key,
                            details: []
                        };
                    }

                    // Add details if they exist and meet round criteria
                    if (
                        item.design_id &&
                        item.implement_id &&
                        item.testcase_id &&
                        (!selectedRound || item.create_round === parseInt(selectedRound))
                    ) {
                        acc[key].details.push({
                            design_id: item.design_id,
                            implement_id: item.implement_id,
                            testcase_id: item.testcase_id,
                            create_round: item.create_round
                        });
                    }

                    return acc;
                }, {});

                // Convert to array and filter out empty details
                const processedData = Object.values(groupedData)
                    .filter(item => item.details && item.details.length > 0);

                setBaselineData(processedData);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId, selectedRound]);

    if (loading) return <div className="loading">กำลังโหลด...</div>;
    if (error) return <div className="error">{error}</div>;

    // Debug render if no data
    if (baselineData.length === 0) {
        return <div className="no-data">ไม่มีข้อมูล</div>;
    }

    const handleSave = async () => {
        try {
            const storedUsername = localStorage.getItem("username");

            if (!storedUsername) {
                alert("กรุณาล็อกอินใหม่");
                return;
            }

            // Get the maximum existing baselinetrace_round for the project.
            const maxRoundResult = await axios.get(`http://localhost:3001/getMaxBaselineRound/${projectId}`);
            let nextRound = 1; // Default to 1 for the first round.

            if (maxRoundResult.data && maxRoundResult.data.maxRound !== null) {
                nextRound = maxRoundResult.data.maxRound + 1;
            }
            // Use nextRound instead of selectedRound.

            const dataToSave = baselineData.flatMap((requirement) =>
                requirement.details.map((detail) => {  // Removed async from here
                    return axios.post("http://localhost:3001/saveBaselineTrace", {
                        project_id: projectId,
                        requirement_id: requirement.requirement_id,
                        design_id: detail.design_id,
                        implement_id: detail.implement_id,
                        testcase_id: detail.testcase_id,
                        baselinetrace_by: storedUsername,
                        baselinetrace_round: nextRound,  // Use the calculated nextRound
                    });
                })
            );

            // Wait for all requests to complete
            await Promise.all(dataToSave);

            // Navigate to the viewBaselineTrace page after successful save.
            alert("บันทึกข้อมูลสำเร็จ");
            navigate(`/viewBaselineTrace?project_id=${projectId}`); // Navigate here

        } catch (error) {
            console.error("Error saving baseline trace", error);
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
    };


    return (
        <div className="traceability-container">
            <h1 className="traceability-title">Baseline Traceability Record</h1>
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
                    {baselineData.map((requirement) => {
                        // Ensure details exists and is an array
                        const details = requirement.details || [];
                        const maxRowSpan = details.length;

                        return details.map((detail, idx) => (
                            <tr key={`${requirement.requirement_id}-${idx}`}>
                                {idx === 0 && (
                                    <td rowSpan={maxRowSpan} className="requirement-cell">
                                        <div className="reqid-trace">
                                            {`REQ-${requirement.requirement_id}`}
                                        </div>
                                    </td>
                                )}
                                <td>{`DE-${detail.design_id}`}</td>
                                <td>{`IMP-${detail.implement_id}`}</td>
                                <td>{`TC-${detail.testcase_id}`}</td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>
            <button className="save-baseline-trace" onClick={handleSave}>Save</button>
        </div>
    );
};

export default CreateBaselineTrace;