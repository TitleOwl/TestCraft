import React, { useState, useEffect } from 'react';
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
import LinkGit from './Components/LinkGit';

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
import VeriVaView from './Components/VeriVaView';
import TryToReq from './Components/TryToReq';
import Uploadfile from './Components/Uploadfile';
import ViewFile from './Components/ViewFile';
import VersionControl from './Components/VersionControl';
import Comment from './Components/Comment';
import VericriReqDetails from './Components/VericriReqDetails';
import HistoryValidationReq from './Components/HistoryValidationReq';
import VerificationHistory from './Components/VerificationHistory';

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
import CreateDiagram from './Components/CreateDiagram';
import ViewDiagram from './Components/viewDiagram';
import UpdateDiagram from './Components/UpdateDiagram';
import VersionDesign from './Components/VersionDesign';
import VericriDesignDetails from './Components/VericriDesignDetails'
import VeriDesignHis from './Components/VeriDesignHis'

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
import VeriTestHis from './Components/Testcase/VeriTestHis';


//Alert Delete Testcase
import ConfirmationModal from './Components/Testcase/ConfirmationModal';


//Traceability
import TraceabilityPage from './Components/Traceability/traceabilityPage';
import EditReqTrace from './Components/Traceability/editReqTrace';
import ViewDesignTrace from './Components/Traceability/viewDesignTrace'
import CreateVerifyTrace from './Components/Traceability/createVerifyTrace';
import ViewVerifyTrace from './Components/Traceability/viewVerifyTrace';
import VerifyTrace from './Components/Traceability/verifyTrace';
import ViewBaselineTrace from './Components/Traceability/viewBaselineTrace';
import SetBaselineTrace from './Components/Traceability/setBaselineTrace';
import CreateBaselineTrace from './Components/Traceability/createBaselineTrace';
import ViewBaselineRound from './Components/Traceability/viewBaselineRound';
import VersionVerTrace from './Components/Traceability/versionVerTrace'
import ViewTraceVersion from './Components/Traceability/viewTraceVersion';
import CommentVerTrace from './Components/Traceability/commentVerTrace';
import CurrentBaselineTrace from './Components/Traceability/currentBaselineTrace';
import ViewBaselineCurrent from './Components/Traceability/viewBaselineCurrent';
import VeriTraceHis from './Components/Traceability/VeriTraceHis';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const [username, setUsername] = useState(null); // State เก็บชื่อผู้ใช้ที่ล็อกอิน
  const location = useLocation();
  const [lastToast, setLastToast] = useState('');

  useEffect(() => {
    if (location.pathname !== lastToast) {
      toast.dismiss();
      setLastToast(location.pathname); // บันทึกเส้นทางล่าสุดที่แสดง Toast
    }
  }, [location.pathname, lastToast]);

  const shouldShowNavbar = !['/', '/Signup'].includes(location.pathname);

  return (
    <>
      {/* แสดง Navbar */}
      {shouldShowNavbar && <Navbar username={username} />}

      {/* แสดง ToastContainer */}
      <ToastContainer
        position="top-right" // ตำแหน่งของ Toast
        autoClose={1500}     // เวลาปิดอัตโนมัติ
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"        // หรือ dark, colored
      />
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
        <Route path="/LinkGit" element={<LinkGit />} />


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
        <Route path="/VeriVaView" element={<VeriVaView />} />
        <Route path="/VericriReqDetails" element={<VericriReqDetails />} />
        <Route path="/HistoryValidationReq/:requirementId" element={<HistoryValidationReq />} />
        <Route path="/VerificationHistory" element={<VerificationHistory />} />

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
        <Route path="/CreateDiagram" element={<CreateDiagram />} />
        <Route path="/viewDiagram" element={<ViewDiagram />} />
        <Route path="/UpdateDiagram" element={<UpdateDiagram />} />
        <Route path="/VersionDesign" element={<VersionDesign />} />
        <Route path="/VericriDesignDetails" element={<VericriDesignDetails />} />
        <Route path="/VeriDesignHis" element={<VeriDesignHis />} />


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
        <Route path="/VeriTestHis" element={<VeriTestHis />} />

        {/* Alert Delete Testcase */}
        <Route path="/ConfirmationModal" element={<ConfirmationModal />} />

        {/* ทำ Implement */}
        <Route path="/implementPage" element={<ImplementPage />} />

        {/* ทำ Trace */}
        <Route path="/traceabilityPage" element={<TraceabilityPage />} />

        <Route path="/editReqTrace" element={<EditReqTrace />} />
        <Route path="/createVerifyTrace" element={<CreateVerifyTrace />} />
        <Route path="/viewDesignTrace" element={<ViewDesignTrace />} />
        <Route path="/viewVerifyTrace" element={<ViewVerifyTrace />} />
        <Route path="/verifyTrace" element={<VerifyTrace />} />
        <Route path="/viewBaselineTrace" element={<ViewBaselineTrace />} />
        <Route path="/setBaselineTrace" element={<SetBaselineTrace />} />
        <Route path="/createBaselineTrace" element={<CreateBaselineTrace />} />
        <Route path="/viewBaselineRound" element={<ViewBaselineRound />} />
        <Route path="/versionVerTrace" element={<VersionVerTrace />} />
        <Route path="/viewTraceVersion" element={<ViewTraceVersion />} />
        <Route path="/commentVerTrace" element={<CommentVerTrace />} />
        <Route path="/currentBaselineTrace" element={<CurrentBaselineTrace />} />
        <Route path="/viewBaselineCurrent" element={<ViewBaselineCurrent />} />
        <Route path="/VeriTraceHis" element={<VeriTraceHis />} />
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
