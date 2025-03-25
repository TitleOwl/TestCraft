import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import "./CSS/traceabilityPage.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen, faSearch, faSort, faSortUp, faSortDown } from "@fortawesome/free-solid-svg-icons";
import createvervar from "./image/createvervar.png";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const TraceabilityPage = () => {
    const [traceabilityData, setTraceabilityData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchColumn, setSearchColumn] = useState("all");
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const projectId = queryParams.get("project_id");
    const [notMatchData, setNotMatchData] = useState([]);
    const [columns, setColumns] = useState([
        { id: 'requirementId', title: 'Requirement ID', nameKey: 'RequirementName' },
        { id: 'designId', title: 'Design ID', nameKey: 'DiagramNames' },
        { id: 'implementId', title: 'Code Component ID', nameKey: 'ImplementFilenames' },
        { id: 'testCaseId', title: 'Test Case ID', nameKey: 'TestCaseNames' }
    ]);
    const [processedData, setProcessedData] = useState([]);


    const NotMatchItem = React.memo(({ item }) => (
        <li className="not-match-item">
            <strong>{item.type}:</strong>
            {item.type === 'Requirement' && ` REQ-${item.id}`}
            {item.type === 'Design' && ` DE-${item.id}`}
            {item.type === 'Component' && ` IMP-${item.id}`}
            {item.type === 'Testcase' && ` TC-${item.id}`} - {item.name}
        </li>
    ));


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

                // Fetch notMatchData here as well
                const notMatchResponse = await axios.get("http://localhost:3001/not-linked-non-baseline", {
                    params: { projectId },
                });

                if (Array.isArray(notMatchResponse.data)) {
                    setNotMatchData(notMatchResponse.data);
                } else {
                    console.error("รูปแบบข้อมูลไม่ถูกต้อง", notMatchResponse.data);
                    setNotMatchData([]);
                }
            } catch (err) {
                console.error(err);
                setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    useEffect(() => {
        let filtered = traceabilityData.filter(item => {
            const lowerSearchTerm = searchTerm.toLowerCase();

            if (searchColumn === "all") {
                return (
                    String(item.RequirementID).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.RequirementName).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.DesignIDs).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.ImplementIDs).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.ImplementFilenames).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.TestCaseIDs).toLowerCase().includes(lowerSearchTerm) ||
                    String(item.TestCaseNames).toLowerCase().includes(lowerSearchTerm)
                );
            } else {
                const column = columns.find(col => col.id === searchColumn);
                if (!column) {
                    return true;
                }

                const searchValue = lowerSearchTerm;

                if (column.id === 'requirementId') {
                    return String(item.RequirementID).toLowerCase().includes(searchValue);
                } else if (column.id === 'designId') {
                    return String(item.DesignIDs).toLowerCase().includes(searchValue);
                } else if (column.id === 'implementId') {
                    return String(item.ImplementIDs).toLowerCase().includes(searchValue);
                } else if (column.id === 'testCaseId') {
                    return String(item.TestCaseIDs).toLowerCase().includes(searchValue);
                }
            }
            return true; // Default return if no condition matches
        });

        const grouped = filtered.reduce((acc, item) => {
            const key = item.RequirementID;
            if (!acc[key]) {
                acc[key] = {
                    ...item,
                    details: [],
                };
            }
            const designIDs = item.DesignIDs ? item.DesignIDs.split(',') : [];
            const implementIDs = item.ImplementIDs ? item.ImplementIDs.split(',') : [];
            const implementFilenames = item.ImplementFilenames ? item.ImplementFilenames.split(',') : [];
            const testCaseIDs = item.TestCaseIDs ? item.TestCaseIDs.split(',') : [];
            const testCaseNames = item.TestCaseNames ? item.TestCaseNames.split(',') : [];

            designIDs.forEach((designID, index) => {
                acc[key].details.push({
                    designID: designID.trim(),
                    implementID: implementIDs[index]?.trim(),
                    implementFilename: implementFilenames[index]?.trim(),
                    testCaseID: testCaseIDs[index]?.trim(),
                    testCaseName: testCaseNames[index]?.trim(),
                });
            });
            return acc;
        }, {});

        let sorted = Object.values(grouped);
        if (sortBy) {
            sorted = applySort(sorted, sortBy, sortOrder);
        }

        setProcessedData(sorted);
    }, [traceabilityData, searchTerm, searchColumn, sortBy, sortOrder, columns]);


    const moveColumn = (dragIndex, hoverIndex) => {
        const newColumns = [...columns];
        const [draggedColumn] = newColumns.splice(dragIndex, 1);
        newColumns.splice(hoverIndex, 0, draggedColumn);
        setColumns(newColumns);
    };

    const applySort = (data, column, order) => {
        if (!column) return data;

        return [...data].sort((a, b) => {
            const sortOrder = order === 'asc' ? 1 : -1;

            if (column === 'requirementId') {
                return sortOrder * (parseInt(a.RequirementID) - parseInt(b.RequirementID));
            } else {
                const extractId = (detail) => {
                    if (column === 'designId' && detail.designID) {
                        return parseInt(detail.designID.replace(/[^0-9]/g, ''), 10);
                    }
                    if (column === 'implementId' && detail.implementID) {
                        return parseInt(detail.implementID.replace(/[^0-9]/g, ''), 10);
                    }
                    if (column === 'testCaseId' && detail.testCaseID) {
                        return parseInt(detail.testCaseID.replace(/[^0-9]/g, ''), 10);
                    }
                    return order === 'asc' ? Infinity : -Infinity;
                };
                const aVal = a.details.length > 0 ? extractId(a.details[0]) : (order === 'asc' ? Infinity : -Infinity);
                const bVal = b.details.length > 0 ? extractId(b.details[0]) : (order === 'asc' ? Infinity : -Infinity);
                return sortOrder * (aVal - bVal);
            }
        });
    };

    const handleSort = (column) => {
        const newSortOrder = sortBy === column ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
        setSortBy(column);
        setSortOrder(newSortOrder);
    };

    const getSortIcon = (column) => {
        if (sortBy === column) {
            return sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />;
        }
        return <FontAwesomeIcon icon={faSort} />;
    };

    const ColumnHeader = React.memo(({ column, index, moveColumn }) => {
        const ref = useRef(null);
        const [, drop] = useDrop({
            accept: 'column-header',
            hover(draggedItem, monitor) {
                if (!ref.current) { return; }
                const dragIndex = draggedItem.index;
                const hoverIndex = index;
                if (dragIndex === hoverIndex) { return; }

                const hoverBoundingRect = ref.current.getBoundingClientRect();
                const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
                const clientOffset = monitor.getClientOffset();
                const hoverClientX = clientOffset.x - hoverBoundingRect.left;

                if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) { return; }
                if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) { return; }

                moveColumn(dragIndex, hoverIndex);
                draggedItem.index = hoverIndex;
            },
        });

        const [{ isDragging }, drag] = useDrag({
            type: 'column-header',
            item: () => ({ id: column.id, index }),
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
        });

        const opacity = isDragging ? 0 : 1;
        drag(drop(ref));

        return (
            <th ref={ref} style={{ opacity }} onClick={() => handleSort(column.id)}>
                {column.title} {getSortIcon(column.id)}
            </th>
        );
    });

    const Cell = React.memo(({ item, detail, columnId, rowSpan }) => {
        switch (columnId) {
            case 'requirementId':
                return rowSpan ? (
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
                ) : null;
            case 'designId':
                return (
                    <td >{`DE-${detail.designID}`}
                        <div className="designname-trace">{`DESIGN-NAME : ${item.DiagramNames}`}</div>
                        <div className="req-allbutton-trace">
                            <button className="design-action-btn view" onClick={() => navigate(`/viewDesignTrace?project_id=${projectId}&design_id=${detail.designID}`)}>
                                <FontAwesomeIcon icon={faEye} />
                            </button>
                            <button className="button-req-trace" onClick={() => navigate(`/editReqTrace?requirement_id=${item.RequirementID}&project_id=${projectId}`)}>
                                <FontAwesomeIcon icon={faPen} className="edit-req-trace" />
                            </button>
                        </div>
                    </td>
                );
            case 'implementId':
                return (
                    <td>{`IMP-${detail.implementID}`}
                        <div>{`Filename: ${detail.implementFilename}`}</div>
                    </td>
                );
            case 'testCaseId':
                return (
                    <td>{`TC-${detail.testCaseID}`}
                        <div>{`TESTCASE-NAME : ${detail.testCaseName || ''}`}</div>
                    </td>
                );
            default:
                return null;
        }
    });


    if (loading) return <div className="loading">กำลังโหลด...</div>;
    if (error) return <div className="error">{error}</div>;

    const TraceabilityTable = ({ data }) => {
        const groupedData = data.reduce((acc, item) => {
            if (!acc[item.RequirementID]) {
                acc[item.RequirementID] = {
                    RequirementID: item.RequirementID,
                    RequirementName: item.RequirementName,
                    Designs: {},
                };
            }
            if (item.DesignID) {
                if (!acc[item.RequirementID].Designs[item.DesignID]) {
                    acc[item.RequirementID].Designs[item.DesignID] = {
                        ImplementIDs: [],
                        TestcaseIDs: [],
                    };
                }
                if (item.ImplementID) {
                    acc[item.RequirementID].Designs[item.DesignID].ImplementIDs.push(
                        item.ImplementID
                    );
                }
                if (item.TestcaseID) {
                    acc[item.RequirementID].Designs[item.DesignID].TestcaseIDs.push(item.TestcaseID);
                }
            }
            return acc;
        }, {});

        const tableData = Object.values(groupedData);

        return (
            <div className="traceability-grid">
                <div className="grid-header">REQ</div>
                <div className="grid-header">Design</div>
                <div className="grid-header">Code component</div>
                <div className="grid-header">Test case</div>

                {tableData.map((item) => (
                    <React.Fragment key={item.RequirementID}>
                        <div className="req-cell" style={{ gridRow: `span ${Object.keys(item.Designs).length || 1}` }}>
                            {item.RequirementID}
                        </div>
                        {Object.keys(item.Designs).map((designKey, index) => (
                            <React.Fragment key={`${item.RequirementID}-${designKey}`}>
                                <div className="design-cell">
                                    {designKey !== "-" ? designKey : <span className="no-relation">-</span>}
                                </div>
                                <div className="code-cell">
                                    {item.Designs[designKey].ImplementIDs.length > 0 ? (
                                        item.Designs[designKey].ImplementIDs.join(", ")
                                    ) : (
                                        <span className="no-relation">-</span>
                                    )}
                                </div>
                                <div className="test-cell">
                                    {item.Designs[designKey].TestcaseIDs.length > 0 ? (
                                        item.Designs[designKey].TestcaseIDs.join(", ")
                                    ) : (
                                        <span className="no-relation">-</span>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                        {Object.keys(item.Designs).length === 0 && (
                            <>
                                <div className="design-cell"><span className="no-relation">-</span></div>
                                <div className="code-cell"><span className="no-relation">-</span></div>
                                <div className="test-cell"><span className="no-relation">-</span></div>
                            </>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };


    return (
        <DndProvider backend={HTML5Backend}>
            <div className="traceability-container">
                <button className='verify-trace' onClick={() => navigate(`/createVerifyTrace?project_id=${projectId}`)}> <img src={createvervar} alt="createver" className="createver" />Create Verification</button>
                <button className='view-verify-trace' onClick={() => navigate(`/viewVerifyTrace?project_id=${projectId}`)}> View Verification</button>
                <button className='baseline-trace' onClick={() => navigate(`/viewBaselineTrace?project_id=${projectId}`)}>Baseline</button>
                <button className='version-trace' onClick={() => navigate(`/versionTrace?project_id=${projectId}`)}>Version Control</button>
                <h1 className="traceability-title">Traceability Record</h1>

                <div className="search-bar-container">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    <select
                        value={searchColumn}
                        onChange={(e) => setSearchColumn(e.target.value)}
                        className="search-select"
                    >
                        <option value="all">All Columns</option>
                        <option value="requirementId">Requirement ID</option>
                        <option value="designId">Design ID</option>
                        <option value="implementId">Code Component ID</option>
                        <option value="testCaseId">Test Case ID</option>
                    </select>
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                </div>

                <table className="traceability-table">
                    <thead>
                        <tr style={{ cursor: "grab" }}>
                            {columns.map((column, index) => (
                                <ColumnHeader key={column.id} column={column} index={index} moveColumn={moveColumn} />
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((item) => {
                            const rowSpan = item.details.length;
                            return item.details.map((detail, detailIdx) => (
                                <tr key={`${item.RequirementID}-${detailIdx}`}>
                                    {columns.map((column) => (
                                        <Cell
                                            key={`${item.RequirementID}-${detailIdx}-${column.id}`}
                                            item={item}
                                            detail={detail}
                                            columnId={column.id}
                                            rowSpan={detailIdx === 0 ? rowSpan : 0}
                                        />
                                    ))}
                                </tr>
                            ));
                        })}
                    </tbody>
                </table>
                <div className="traceability-container">
                    <div className="not-match-container">
                        <h1 className="traceability-title-notmatch">Partial Work Product Relation Table</h1>
                        <TraceabilityTable data={notMatchData} />
                    </div>
                </div>
            </div>
        </DndProvider>
    );
};

export default TraceabilityPage;