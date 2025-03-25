import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ViewBaselineRound = () => {
    const [baselineData, setBaselineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(window.location.search);
    const projectId = queryParams.get("project_id");
    const round = queryParams.get("round");

    useEffect(() => {
        if (projectId && round) {
            axios.get(`http://localhost:3001/viewBaselineTraceDetail?project_id=${projectId}&round=${round}`)
                .then(response => {
                    // จัดกลุ่มข้อมูลตาม requirement_id
                    const groupedData = response.data.data.reduce((acc, item) => {
                        const { requirement_id, design_id, implement_id, testcase_id } = item;

                        // หาก requirement_id ยังไม่อยู่ใน acc ให้สร้างใหม่
                        if (!acc[requirement_id]) {
                            acc[requirement_id] = {
                                requirement_id,
                                details: []
                            };
                        }

                        // เพิ่มข้อมูลลงใน details
                        acc[requirement_id].details.push({
                            design_id,
                            implement_id,
                            testcase_id
                        });

                        return acc;
                    }, {});

                    // เปลี่ยนข้อมูลที่จัดกลุ่มแล้วให้เป็น array
                    setBaselineData(Object.values(groupedData));
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Error fetching baseline trace detail:', error);
                    setError('Error fetching baseline trace data');
                    setLoading(false);
                });
        }
    }, [projectId, round]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <div>
            <button className="baselineround-to-trace" onClick={() =>
                navigate(`/viewBaselineTrace?project_id=${projectId}`)
            }>Back</button>
            <h2>Baseline Traceability Detail for Round {round}</h2>
            <table className="traceability-table">
                <thead>
                    <tr>
                        <th>Requirement ID</th>
                        <th>Design ID</th>
                        <th>Implement ID</th>
                        <th>Testcase ID</th>
                    </tr>
                </thead>
                <tbody>
                    {baselineData.map((requirement) => {
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
        </div>
    );
};

export default ViewBaselineRound;
