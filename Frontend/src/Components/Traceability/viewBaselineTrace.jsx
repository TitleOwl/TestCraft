import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom';

const setBaselineTrace = () => {
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get("project_id");
  
  return (
    <div>
      <button onClick={() => navigate(`/setBaselineTrace?project_id=${projectId}`)}>Set Baseline</button>
    </div >
  )
}

export default setBaselineTrace
