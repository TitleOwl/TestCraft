import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css'; // Make sure Bootstrap CSS is imported

// Login
import Login from './Components/Login';
import Signup from './Components/Signup';

// Home
import Home from './Components/Home';
import Navbar from './Components/Navbar';

// Project
import Project from './Components/Project';
import CreateProject from './Components/CreateProject';
import UpdateProject from './Components/UpdateProject';
import ProjectConfig from './Components/ProjectConfig';


// Dashboard
import Dashboard from './Components/Dashboard';

// Overview
import OverviewProject from './Components/Project/OverviewProject';

// Requirement
import RequirementPage from './Components/RequirementPage';
import CreateRequirement from './Components/CreateRequirement';
import ViewEditReq from './Components/ViewEditReq';
import UpdateRequirement from './Components/UpdateRequirement';
import CreateVeri from './Components/CreateVeri';
import VerificationList from './Components/VerificationList';
import ReqVerification from './Components/ReqVerification';
import CreateVar from './Components/CreateVar';
import ValidationList from './Components/ValidationList';
import ReqValidation from './Components/ReqValidation';
import Baseline from './Components/Baseline';
import CreateBaseline from './Components/CreateBaseline';
import TryToReq from './Components/TryToReq';
import Uploadfile from './Components/Uploadfile';
import ViewFile from './Components/ViewFile';
import VersionControl from './Components/VersionControl';
import Comment from './Components/Comment';

// Design
import DesignPage from './Components/DesignPage';
import CreateDesign from './Components/CreateDesign';
import ViewDesign from './Components/ViewDesign';
import CreateVeriDesign from './Components/CreateVeriDesign';
import VeriDesign from './Components/VeriDesign';
import DesignVerifed from './Components/DesignVerifed';
import DesignBaseline from './Components/DesignBaseline';
import CreateDesignbaseline from './Components/CreateDesignbaseline';
import UpdateDesign from './Components/UpdateDesign';

//Implement
import ImplementPage from './Components/Implement/implementPage';


// Testcase
import CreateTestcase from './Components/Testcase/CreateTestcase';
import TestcasePage from './Components/Testcase/TestcasePage';
import TestcaseDetail from './Components/Testcase/TestcaseDetail';
import TestProcedures from './Components/Testcase/TestProcedures';
import UpdateTestcase from './Components/Testcase/UpdateTestcase';
import ExecutionList from './Components/Testcase/ExecutionList';
import TestExecution from './Components/Testcase/TestExecution';
import CreateVeriTest from './Components/Testcase/CreateVeriTest';
import VeriTestcase from './Components/Testcase/VeriTestcase';
import TestcaseVerifed from './Components/Testcase/TestcaseVerifed';
import TestcaseBaseline from './Components/Testcase/TestcaseBaseline';
import CreateTestcasebaseline from './Components/Testcase/CreateTestcasebaseline';

//Traceability
import TraceabilityPage from './Components/Traceability/traceabilityPage';
import ViewReqTrace from './Components/Traceability/viewReqTrace';
import EditReqTrace from './Components/Traceability/editReqTrace';
import ViewDesignTrace from './Components/Traceability/viewDesignTrace'
import VerifyTrace from './Components/Traceability/createVerifyTrace';

// Notify
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const [username, setUsername] = useState(null); // State เก็บชื่อผู้ใช้ที่ล็อกอิน
  const location = useLocation();

  // ตรวจสอบเส้นทางปัจจุบัน
  const shouldShowNavbar = !['/', '/Signup'].includes(location.pathname);

  return (
    <>
      {/* แสดง Navbar และส่ง username ไปแสดง */}
      {shouldShowNavbar && <Navbar username={username} />}

      {/* วาง ToastContainer นอก Routes */}
      <ToastContainer position="top-center" />
      <Routes>
        {/* Route สำหรับหน้า Home */}
        <Route path="/Home" element={<Home />} />

        {/* Routes สำหรับการจัดการ Project */}
        <Route path="/Project" element={<Project />} />
        <Route path="/CreateProject" element={<CreateProject />} />
        <Route path="/UpdateProject/:id" element={<UpdateProject />} />

        {/* Route สำหรับ Dashboard */}
        <Route path="/Dashboard" element={<Dashboard />} />

        {/* Route สำหรับ Overview */}
        <Route path="/OverviewProject" element={<OverviewProject />} />

        {/* Routes สำหรับการตั้งค่า Project */}
        <Route path="/ProjectConfig" element={<ProjectConfig />} />

        {/* Routes สำหรับ Verification and Validation */}
        <Route path="/CreateVeri" element={<CreateVeri />} />
        <Route path="/CreateVar" element={<CreateVar />} />
        <Route path="/VerificationList" element={<VerificationList />} />
        <Route path="/ValidationList" element={<ValidationList />} />

        {/* Routes สำหรับ Requirements */}
        <Route path="/requirementPage" element={<RequirementPage />} />
        <Route path="/ViewEditReq" element={<ViewEditReq />} />
        <Route path="/CreateRequirement" element={<CreateRequirement />} />
        <Route path="/UpdateRequirement" element={<UpdateRequirement />} />
        <Route path="/ReqVerification" element={<ReqVerification />} />
        <Route path="/ReqValidation" element={<ReqValidation />} />
        <Route path="/ViewFile" element={<ViewFile />} />

        {/* Routes สำหรับ Login */}
        <Route path="/" element={<Login setUsername={setUsername} />} />
        <Route path="/Signup" element={<Signup />} />

        {/* ไฟล์ทดลอง */}
        <Route path="/TryToReq" element={<TryToReq />} />
        <Route path="/Uploadfile" element={<Uploadfile />} />

        {/* ทำ version control */}
        <Route path="/VersionControl" element={<VersionControl />} />

        {/* ทำ comment */}
        <Route path="/Comment" element={<Comment />} />

        {/* ทำ Baseline */}
        <Route path="/CreateBaseline" element={<CreateBaseline />} />
        <Route path="/Baseline" element={<Baseline />} />

        {/* ทำ Design */}
        <Route path="/DesignPage" element={<DesignPage />} />
        <Route path="/CreateDesign" element={<CreateDesign />} />
        <Route path="/ViewDesign" element={<ViewDesign />} />
        <Route path="/UpdateDesign" element={<UpdateDesign />} />
        <Route path="/CreateVeriDesign" element={<CreateVeriDesign />} />
        <Route path="/VeriDesign" element={<VeriDesign />} />
        <Route path="/DesignVerifed" element={<DesignVerifed />} />
        <Route path="/DesignBaseline" element={<DesignBaseline />} />
        <Route path="/CreateDesignbaseline" element={<CreateDesignbaseline />} />

        {/* ทำ Testcase */}
        <Route path="/CreateTestcase" element={<CreateTestcase />} />
        <Route path="/TestcasePage" element={<TestcasePage />} />
        <Route path="/TestcaseDetail" element={<TestcaseDetail />} />
        <Route path="/TestProcedures" element={<TestProcedures />} />
        <Route path="/UpdateTestcase" element={<UpdateTestcase />} />
        <Route path="/TestExecution/:testcaseId" element={<TestExecution />} />
        <Route path="/ExecutionList" element={<ExecutionList />} />
        <Route path="/CreateVeriTest" element={<CreateVeriTest />} />
        <Route path="/VeriTestcase" element={<VeriTestcase />} />
        <Route path="/TestcaseVerifed" element={<TestcaseVerifed />} />
        <Route path="/TestcaseBaseline" element={<TestcaseBaseline />} />
        <Route path="/CreateTestcasebaseline" element={<CreateTestcasebaseline />} />


        {/* ทำ Implement */}
        <Route path="/implementPage" element={<ImplementPage />} />

        {/* ทำ Trace */}
        <Route path="/traceabilityPage" element={<TraceabilityPage />} />
        <Route path="/viewReqTrace" element={<ViewReqTrace />} />
        <Route path="/editReqTrace" element={<EditReqTrace />} />
        <Route path="/createVerifyTrace" element={<VerifyTrace />} />
        <Route path="/viewDesignTrace" element={<ViewDesignTrace />} />
      </Routes>
    </>
  );
};

const WrappedApp = () => (
  <Router>
    <App />
  </Router>
);

export default WrappedApp;
