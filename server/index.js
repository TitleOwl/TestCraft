const express = require('express');
const bodyParser = require("body-parser");
const multer = require('multer');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const fs = require("fs");
const path = require("path");
const router = express.Router();


// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use('/files', express.static(path.join(__dirname, 'uploads')));

// ตั้งค่า multer เพื่อใช้ memoryStorage (เก็บไฟล์ใน memory)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Database Connection
const db = mysql.createConnection({
    user: "root",
    host: "localhost",
    password: "",
    database: "testcraft"
});

// Test Database Connection
db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database as ID', db.threadId);
});


app.post('/api/diagrams', (req, res) => {
    // 1. ดึงข้อมูลจาก Request Body
    const { elements, design_id } = req.body;

    // 2. ตรวจสอบข้อมูลเบื้องต้น
    if (!elements || !Array.isArray(elements)) {
        return res.status(400).json({ message: 'ข้อมูล "elements" ไม่ถูกต้องหรือไม่ครบถ้วน' });
    }
    if (design_id === undefined || design_id === null || typeof design_id !== 'number') {
        return res.status(400).json({ message: 'ข้อมูล "design_id" ไม่ถูกต้องหรือไม่ครบถ้วน' });
    }

    // 3. แปลง Array 'elements' เป็น JSON String
    let drawingDataString;
    try {
        drawingDataString = JSON.stringify(elements);
    } catch (stringifyError) {
        console.error("เกิดข้อผิดพลาดตอนแปลง elements เป็น JSON:", stringifyError);
        return res.status(400).json({ message: 'ไม่สามารถประมวลผลข้อมูล drawing data ได้' });
    }

    // 4. เตรียม SQL Query สำหรับ INSERT
    const sql = 'INSERT INTO file_diagram (drawing_data, design_id) VALUES (?, ?)';
    const values = [drawingDataString, design_id];

    // 5. สั่ง Execute SQL Query โดยใช้ตัวแปร 'db' ที่คุณมีอยู่แล้ว
    //    *** เปลี่ยนจาก pool.query เป็น db.query ตรงนี้ ***
    db.query(sql, values, (error, results, fields) => {
        // 6. จัดการผลลัพธ์ หรือ ข้อผิดพลาด
        if (error) {
            console.error('Database Error:', error);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลลงฐานข้อมูล' });
        }

        // ถ้า Query สำเร็จ
        console.log('บันทึก Diagram สำเร็จ! ID ที่ได้:', results.insertId);
        res.status(201).json({
            message: 'บันทึก Diagram สำเร็จ!',
            insertedId: results.insertId
        });
    });
});

// --- API Endpoint to GET a diagram by design_id ---
app.get('/api/diagrams/design/:designId', (req, res) => {
    // 1. Extract designId from route parameters
    const designId = parseInt(req.params.designId, 10); // Convert to integer

    // 2. Validate input
    if (isNaN(designId)) {
        return res.status(400).json({ message: 'Invalid Design ID provided.' });
    }

    // 3. Prepare SQL Query
    // Assuming one diagram per design_id. Adjust if needed.
    const sql = 'SELECT drawing_data FROM file_diagram WHERE design_id = ? LIMIT 1';
    const values = [designId];

    // 4. Execute Query
    db.query(sql, values, (error, results, fields) => {
        // 5. Handle Errors
        if (error) {
            console.error('Database Error:', error);
            return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Diagram' });
        }

        // 6. Handle Not Found
        if (results.length === 0) {
            console.log(`No diagram found for design_id: ${designId}`);
            // It's okay if no diagram is saved yet, return empty elements or 404
            // Option 1: Return 404 Not Found
            // return res.status(404).json({ message: 'ไม่พบข้อมูล Diagram สำหรับ Design ID นี้' });
            // Option 2: Return 200 OK with empty elements array (frontend can handle this)
            return res.status(200).json({ elements: [] });
        }

        // 7. Handle Success - Parse and Send Data
        try {
            const drawingDataString = results[0].drawing_data;
            // Parse the JSON string stored in LONGTEXT back into an object/array
            const elements = JSON.parse(drawingDataString);

            // Send the parsed elements array back to the frontend
            res.status(200).json({ elements: elements });

        } catch (parseError) {
            console.error(`Error parsing drawing_data for design_id ${designId}:`, parseError);
            // This indicates corrupted data in the database
            res.status(500).json({ message: 'เกิดข้อผิดพลาด: ข้อมูล Diagram ที่บันทึกไว้ไม่ถูกต้อง' });
        }
    });
});

// แก้ไขส่วน PUT Endpoint ให้เป็นแบบ Upsert
app.put('/api/diagrams/design/:designId', (req, res) => {
    // 1. ดึงข้อมูล (เหมือนเดิม)
    const designId = parseInt(req.params.designId, 10);
    const { elements } = req.body;

    // 2. ตรวจสอบข้อมูล (เหมือนเดิม)
    if (isNaN(designId)) {
        return res.status(400).json({ message: 'Design ID ใน URL ไม่ถูกต้อง' });
    }
    // สำหรับ Upsert, elements ควรมีค่า (ไม่ควรเป็น null/undefined)
    // แต่อาจยอมรับ array ว่างได้ ถ้าต้องการเคลียร์ diagram
    if (!elements || !Array.isArray(elements)) {
        return res.status(400).json({ message: 'ข้อมูล "elements" ไม่ถูกต้องหรือไม่ครบถ้วน' });
    }

    // 3. แปลง Array 'elements' เป็น JSON String (เหมือนเดิม)
    let drawingDataString;
    try {
        // ถ้า elements เป็น array ว่าง ก็จะแปลงเป็น "[]" ซึ่งถูกต้อง
        drawingDataString = JSON.stringify(elements);
    } catch (stringifyError) {
        console.error("เกิดข้อผิดพลาดตอนแปลง elements เป็น JSON:", stringifyError);
        return res.status(400).json({ message: 'ไม่สามารถประมวลผลข้อมูล drawing data ได้' });
    }

    // --- 4. เปลี่ยน SQL Query เป็น INSERT ... ON DUPLICATE KEY UPDATE ---
    // *** สำคัญ: ตรวจสอบว่าคอลัมน์ 'design_id' ในตาราง 'file_diagram'
    // *** ถูกกำหนดให้เป็น PRIMARY KEY หรือ UNIQUE KEY ***
    const sql = `
        INSERT INTO file_diagram (design_id, drawing_data)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE drawing_data = VALUES(drawing_data)
    `;
    // ค่า values ยังคงเดิม: [designId, drawingDataString]
    const values = [designId, drawingDataString];

    // 5. สั่ง Execute SQL Query (เหมือนเดิม)
    db.query(sql, values, (error, results, fields) => {
        // 6. จัดการผลลัพธ์ หรือ ข้อผิดพลาด (เหมือนเดิม)
        if (error) {
            console.error('Database Error:', error);
            // อาจจะส่ง error message กลับไปละเอียดขึ้น
            return res.status(500).json({ message: `เกิดข้อผิดพลาดในการบันทึก Diagram: ${error.message}` });
        }

        // --- 7. ปรับปรุงการส่ง Response กลับ ให้แยกแยะระหว่าง Insert กับ Update ---
        // results.affectedRows:
        // - จะเป็น 1 ถ้าเป็นการ INSERT ใหม่
        // - จะเป็น 1 ถ้าเป็นการ UPDATE และข้อมูลใหม่ *ต่าง* จากข้อมูลเดิม
        // - จะเป็น 0 ถ้าเป็นการ UPDATE แต่ข้อมูลใหม่ *เหมือน* ข้อมูลเดิม (บาง database configuration) - ถือว่าสำเร็จ
        // - หรืออาจเป็น 2 ถ้าเป็นการ UPDATE (บาง database configuration - affected = delete + insert)
        // results.insertId:
        // - จะมีค่า > 0 ถ้าเป็นการ INSERT ใหม่
        // - จะเป็น 0 ถ้าเป็นการ UPDATE
        // results.warningStatus (or similar property depending on driver/config):
        // - Might be non-zero if the UPDATE didn't change anything

        // ใช้ insertId เพื่อแยกแยะได้ชัดเจนกว่า
        if (results.insertId > 0) {
            // สร้างแถวใหม่สำเร็จ
            console.log(`สร้าง Diagram ใหม่สำเร็จ! Design ID: ${designId}, Insert ID: ${results.insertId}`);
            res.status(201).json({ // 201 Created
                message: 'สร้าง Diagram ใหม่สำเร็จ!',
                designId: designId,
                operation: 'inserted',
                insertedId: results.insertId // ส่ง ID ที่ได้กลับไปด้วย (ถ้าต้องการ)
            });
        } else if (results.affectedRows > 0 || results.warningStatus === 0) {
            // อัปเดตแถวที่มีอยู่สำเร็จ (affectedRows > 0)
            // หรือข้อมูลที่ส่งมาเหมือนเดิม (affectedRows = 0 แต่ warningStatus = 0) - ถือว่าสำเร็จ
            console.log(`อัปเดต Diagram สำเร็จ! Design ID: ${designId} (Affected: ${results.affectedRows})`);
            res.status(200).json({ // 200 OK
                message: 'อัปเดต Diagram สำเร็จ!',
                designId: designId,
                operation: 'updated' // หรือ 'unchanged' ถ้า affectedRows=0
            });
        }
        else {
            // กรณีที่ไม่ควรเกิดขึ้นกับ INSERT ... ON DUPLICATE KEY UPDATE ที่ถูกต้อง
            console.warn(`ไม่สามารถบันทึก Diagram ได้ (Affected: ${results.affectedRows}, InsertID: ${results.insertId})`);
            res.status(500).json({ message: 'ไม่สามารถบันทึก Diagram ได้ (ผลลัพธ์ไม่คาดคิด)' });
        }
    });
});

// ------------------------- PROJECT ROUTES -------------------------
// Get all projects
app.get('/project', (req, res) => {
    db.query("SELECT * FROM project", (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching projects');
        } else {
            res.send(result);
        }
    });
});

app.get('/projectmember', (req, res) => {
    const { username } = req.query; // รับชื่อผู้ใช้งานจาก query

    // Query เพื่อดึงข้อมูลจากฐานข้อมูล project พร้อมกับ project_member
    db.query("SELECT * FROM project", (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching projects');
        }

        // กรอง project โดยตรวจสอบว่า roles ของผู้ใช้งานเป็น "Product Owner"
        const filteredProjects = result.filter((project) => {
            const projectMembers = JSON.parse(project.project_member); // สมมติว่า project_member เป็น JSON
            if (projectMembers.some(member => member.name === username && member.roles.includes("Product Owner"))) {
                return true;
            }
            // ถ้าไม่ใช่ "Product Owner" ให้กรองโดยชื่อผู้ใช้และตรวจสอบ role
            return projectMembers.some(member => member.name === username);
        });

        // ส่งกลับข้อมูลโครงการที่กรองแล้ว
        res.send(filteredProjects);
    });
});



app.get('/projectname', (req, res) => {
    const projectId = req.query.project_id;

    // ถ้ามีการระบุ project_id
    const query = projectId
        ? "SELECT project_member FROM project WHERE project_id = ?" // ตาม project_id
        : "SELECT project_member FROM project"; // ดึงทุก project_member 

    db.query(query, projectId ? [projectId] : [], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching project members');
        } else {
            res.send(result);
        }
    });
});

// เเสดง requirement ในหน้า reqverification
app.get('/requirements', (req, res) => {
    const { requirement_ids } = req.query;

    if (!requirement_ids || !Array.isArray(requirement_ids)) {
        return res.status(400).json({ message: "Invalid requirement_ids" });
    }

    // SQL query เพื่อดึงข้อมูล requirements ที่ตรงกับ requirement_ids
    const sql = `SELECT requirement_id, requirement_name, requirement_type, requirement_description FROM requirement WHERE requirement_id IN (?)`;

    db.query(sql, [requirement_ids], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error fetching requirements" });
        }
        res.status(200).json(data);
    });
});


// Get a project by ID

app.get('/project/data', async (req, res) => {
    const projectName = req.query.name;
    const projectData = await db.findProjectByName(projectName); // ค้นหาโปรเจคในฐานข้อมูล
    if (projectData) {
        res.json(projectData);
    } else {
        res.status(404).json({ error: 'Project not found' });
    }
});

app.get('/project/:id', (req, res) => {
    const sql = "SELECT * FROM project WHERE project_id = ?";
    const id = req.params.id;

    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching project:', err);
            res.status(500).send("Error fetching the project");
        } else if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).send("Project not found");
        }
    });
});

// Add a new project
app.post('/project', (req, res) => {
    console.log('Request Body:', req.body); // ดูข้อมูลที่ส่งมา
    const sql = `
            INSERT INTO project 
            (project_name, project_description, project_member, start_date, end_date, project_status) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
    const values = [
        req.body.project_name,
        req.body.project_description,
        req.body.project_member,
        req.body.start_date,
        req.body.end_date,
        req.body.project_status
    ];

    
    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Database Error:', err); // แสดง Error ใน Console
            return res.status(500).json({ message: "Error adding project" });
        }
        return res.status(200).json({ message: "Project added successfully", data });
    });
});

// Update a project
app.put('/project/:id', (req, res) => {
    const sql = `
        UPDATE project 
        SET 
            project_name = ?, 
            project_description = ?, 
            project_member = ?, 
            start_date = ?, 
            end_date = ?,
            project_status = ?
        WHERE 
            project_id = ?
    `;
    const values = [
        req.body.project_name,
        req.body.project_description,
        req.body.project_member,
        req.body.start_date,
        req.body.end_date,
        req.body.project_status,
        req.params.id
    ];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Error updating project:', err);
            return res.status(500).json({ message: "Error updating project" });
        }
        return res.status(200).json({ message: "Project updated successfully", data });
    });
});


// Delete a project
app.delete('/project/:id', (req, res) => {
    const sql = "DELETE FROM project WHERE project_id = ?";
    const id = req.params.id;

    db.query(sql, [id], (err, data) => {
        if (err) {
            console.error('Error deleting project:', err);
            return res.status(500).json({ message: "Error deleting project" });
        }
        return res.status(200).json({ message: "Project deleted successfully" });
    });
});

// ------------------------- MEMBER ROUTES -------------------------
// Get all members
app.get('/loginname', (req, res) => {
    const sql = 'SELECT user_name FROM login';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching members');
        } else {
            res.json(results);
        }
    });
});

// ------------------------- REQUIREMENT ROUTES -------------------------
// API ดึงข้อมูล requirements ของ project
app.get('/project/:project_id/requirement', (req, res) => {
    const { project_id } = req.params;

    const sql = "SELECT * FROM requirement WHERE project_id = ?";
    const values = [project_id];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error fetching requirements" });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: "No requirements found for this project" });
        }
        return res.status(200).json(data);
    });
});

// ดึงข้อมูลจาก requirement มา update
app.get('/requirement/:id', (req, res) => {
    const requirementId = req.params.id;
  
    // Query ข้อมูล requirement + ความสัมพันธ์กับไฟล์
    const requirementQuery = `
      SELECT r.*, GROUP_CONCAT(frr.filereq_id) AS filereq_ids
      FROM requirement r
      LEFT JOIN file_requirement_relation frr ON r.requirement_id = frr.requirement_id
      WHERE r.requirement_id = ?
      GROUP BY r.requirement_id;
    `;

    db.query(requirementQuery, [requirementId], (err, result) => {
      if (err) {
        console.error("Error fetching requirement:", err);
        return res.status(500).json({ error: 'Database query failed' });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ error: 'Requirement not found' });
      }
  
      // แปลง comma-separated string เป็น array
      const requirement = result[0];
      requirement.filereq_ids = requirement.filereq_ids
        ? requirement.filereq_ids.split(',').map(id => parseInt(id))
        : [];
  
      res.json(requirement);
    });
  });
  

  
  app.put("/requirement/:id", (req, res) => {
      const { id } = req.params;
      // รับ requirement_status จาก body ด้วย
      const { requirement_name, requirement_description, requirement_type, filereq_ids, requirement_status } = req.body;
  
      // --- การตรวจสอบข้อมูลเบื้องต้น ---
      if (!requirement_name || !requirement_description || !requirement_type || !Array.isArray(filereq_ids)) {
          console.error("Validation Error: Missing required fields or filereq_ids is not an array", req.body);
          return res.status(400).json({ message: "Missing required fields or filereq_ids is not an array" });
      }
  
      // --- เริ่ม Transaction (บน Single Connection 'db' - !!! ควรเปลี่ยนเป็น Pool !!!) ---
      console.log(`Starting transaction for Requirement ID: ${id}`);
      db.beginTransaction((err) => {
          if (err) {
              console.error("Error beginning transaction for Requirement ID:", id, err);
              // ไม่ต้อง release() ถ้า db คือ connection เดี่ยว
              return res.status(500).json({ message: "Error starting database transaction" });
          }
          console.log("Transaction started for Requirement ID:", id);
  
          // --- 1. เตรียม SQL และ Parameters สำหรับอัปเดต requirement (จัดการ status แบบมีเงื่อนไข) ---
          let updateRequirementSql = `
              UPDATE requirement
              SET requirement_name = ?, requirement_description = ?, requirement_type = ?`;
          const updateParams = [requirement_name, requirement_description, requirement_type];
  
          // ตรวจสอบว่า frontend ส่ง requirement_status มาหรือไม่
          if (requirement_status) {
              updateRequirementSql += `, requirement_status = ?`;
              updateParams.push(requirement_status);
               console.log(`Requirement ID: ${id} - Updating status to: ${requirement_status}`);
          } else {
              // กรณี Frontend ไม่ส่ง status มา (อาจจะไม่เกิดขึ้นตาม logic ปัจจุบัน)
              // อาจจะ default เป็น 'WORKING' หรือ ไม่ต้องอัปเดต status เลย
              // ปัจจุบัน: ไม่ update status ถ้าไม่ส่งมา
              console.log(`Requirement ID: ${id} - Status not provided in request, status field will not be updated.`);
               // หรือถ้าต้องการให้เป็น WORKING เสมอเมื่อแก้ไข ก็ใส่:
               // updateRequirementSql += `, requirement_status = 'WORKING'`;
               // updateParams.push('WORKING');
          }
  
          updateRequirementSql += ` WHERE requirement_id = ?`;
          updateParams.push(id);
  
          console.log("Executing SQL (Update Requirement):", updateRequirementSql, updateParams);
  
          // --- 2. อัปเดต requirement ---
          db.query(updateRequirementSql, updateParams, (err, updateResult) => {
              if (err) {
                  console.error("Error updating requirement:", id, err);
                  return db.rollback(() => {
                      console.error("Transaction rolled back due to update requirement error for Requirement ID:", id);
                      res.status(500).json({ message: "Error updating requirement data" });
                  });
              }
              // ตรวจสอบว่ามีการอัปเดตแถวจริงหรือไม่ (ป้องกันกรณีใส่ ID ผิด)
              if (updateResult.affectedRows === 0) {
                  console.error("Requirement update failed for ID:", id, "- ID not found?");
                   return db.rollback(() => {
                      console.error("Transaction rolled back because Requirement ID not found:", id);
                      res.status(404).json({ message: `Requirement with ID ${id} not found.` });
                  });
              }
              console.log("Requirement update successful for ID:", id, "AffectedRows:", updateResult.affectedRows);
  
  
              // --- 3. ลบความสัมพันธ์ไฟล์เก่า *ทั้งหมด* สำหรับ requirement นี้ ---
              const deleteRelationsSql = "DELETE FROM file_requirement_relation WHERE requirement_id = ?";
              console.log("Executing SQL (Delete Relations):", deleteRelationsSql, [id]);
              db.query(deleteRelationsSql, [id], (err, deleteResult) => {
                  if (err) {
                      console.error("Error deleting old file relationships for Requirement ID:", id, err);
                      return db.rollback(() => {
                          console.error("Transaction rolled back due to delete relations error for Requirement ID:", id);
                          res.status(500).json({ message: "Error clearing old file relationships" });
                      });
                  }
                  console.log("Delete old relations result for ID:", id, "AffectedRows:", deleteResult.affectedRows);
  
                  // --- 4. เพิ่มความสัมพันธ์ใหม่ *ถ้า* มี filereq_ids ส่งมา ---
                  if (filereq_ids.length > 0) {
                      const insertRelationSql = "INSERT INTO file_requirement_relation (filereq_id, requirement_id, create_at, update_at) VALUES ?";
                      // สร้างข้อมูลสำหรับ bulk insert พร้อม timestamp ปัจจุบัน
                      const relationValues = filereq_ids.map(filereq_id => [filereq_id, id, new Date(), new Date()]);
                      console.log("Executing SQL (Insert Relations):", insertRelationSql, "for", relationValues.length, "files, Req ID:", id);
  
                      db.query(insertRelationSql, [relationValues], (err, insertResult) => {
                          if (err) {
                              console.error("Error inserting new file relationships for Requirement ID:", id, err);
                              // ตรวจสอบ error code สำหรับ duplicate entry (ถ้ามี unique key และไม่ใช้ INSERT IGNORE)
                               if (err.code === 'ER_DUP_ENTRY') {
                                  console.error("Duplicate entry detected during insert for Requirement ID:", id);
                                  // อาจจะ rollback หรือจะแจ้งเตือนแบบอื่น ขึ้นอยู่กับ business logic
                              }
                              return db.rollback(() => {
                                  console.error("Transaction rolled back due to insert relation error for Requirement ID:", id);
                                  res.status(500).json({ message: "Error inserting new file relationships" });
                              });
                          }
                          console.log("Insert new relations result for ID:", id, "AffectedRows:", insertResult.affectedRows);
  
                          // --- 5. Commit Transaction (หลังจาก Insert สำเร็จ) ---
                          db.commit((err) => {
                              if (err) {
                                  console.error("Error committing transaction (after insert) for Requirement ID:", id, err);
                                  return db.rollback(() => {
                                      console.error("Transaction rolled back due to commit error (after insert) for Requirement ID:", id);
                                      res.status(500).json({ message: "Error finalizing update (commit failed)" });
                                  });
                              }
                              console.log("Transaction committed successfully for Requirement ID:", id, "(files relationships updated).");
                              res.status(200).json({
                                  message: "Requirement updated and file relationships set successfully."
                              });
                          });
                      }); // End Insert Query
                  } else {
                      // --- กรณีไม่มี filereq_ids ส่งมา (ผู้ใช้ลบไฟล์แนบออกหมด) ---
                      console.log("No new file relationships to insert for Requirement ID:", id, "(All attachments removed or none selected).");
                      // --- 5. Commit Transaction (เมื่อไม่มีอะไรต้อง Insert) ---
                      db.commit((err) => {
                          if (err) {
                              console.error("Error committing transaction (no files) for Requirement ID:", id, err);
                              return db.rollback(() => {
                                  console.error("Transaction rolled back due to commit error (no files) for Requirement ID:", id);
                                  res.status(500).json({ message: "Error finalizing update (commit failed)" });
                              });
                          }
                          console.log("Transaction committed successfully for Requirement ID:", id, "(no files attached).");
                          res.status(200).json({
                              message: "Requirement updated successfully (no files attached)."
                          });
                      }); // End Commit (no files)
                  } // End else (no filereq_ids)
              }); // End Delete Query
          }); // End Update Requirement Query
      }); // End Begin Transaction
  });

app.post('/requirement', (req, res) => {
    const { requirement_name, requirement_type, requirement_description, requirement_status, project_id, filereq_ids } = req.body;

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นทั้งหมดหรือไม่
    if (!requirement_name || !requirement_type || !requirement_description || !requirement_status || !project_id || !filereq_ids || !Array.isArray(filereq_ids)) {
        return res.status(400).json({ message: "Missing required fields or filereq_ids is not an array" });
    }

    // สร้าง SQL query สำหรับการแทรกข้อมูลในตาราง requirement
    const sql = "INSERT INTO requirement (requirement_name, requirement_type, requirement_description, requirement_status, project_id) VALUES (?, ?, ?, ?, ?)";
    const values = [requirement_name, requirement_type, requirement_description, requirement_status, project_id];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error adding requirement" });
        }

        const requirementId = data.insertId; // ดึงค่า requirement_id ที่เพิ่งสร้างขึ้นมา

        // ถ้าไม่มี filereq_ids ให้ส่ง response ทันที
        if (filereq_ids.length === 0) {
            return res.status(201).json({
                message: "Requirement added successfully",
                requirement_id: requirementId
            });
        }

        // เตรียม SQL สำหรับการแทรกข้อมูลลงในตาราง file_requirement_relation
        const insertRelationSql = "INSERT INTO file_requirement_relation (filereq_id, requirement_id) VALUES ?";
        const relationValues = filereq_ids.map(filereq_id => [filereq_id, requirementId]);

        db.query(insertRelationSql, [relationValues], (relationErr, relationData) => {
            if (relationErr) {
                console.error(relationErr);
                return res.status(500).json({ message: "Error inserting into file_requirement_relation" });
            }

            return res.status(201).json({
                message: "Requirement and file relationships added successfully",
                requirement_id: requirementId
            });
        });
    });
});


// PUT /requirement/:id - Update requirement status
app.put("/statusrequirement/:id", (req, res) => {
    const { id } = req.params;
    const { requirement_status } = req.body;  // Only update the status
    const sql = "UPDATE requirement SET requirement_status = ? WHERE requirement_id = ?";

    db.query(sql, [requirement_status, id], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error updating requirement status" });
        }
        return res.status(200).json({ message: "Requirement status updated successfully" });
    });
});


app.delete('/requirement/:id', (req, res) => {
    const { id } = req.params;

    console.log("Deleting requirement with ID:", id);

    const checkRequirementSQL = "SELECT COUNT(*) AS count FROM requirement WHERE requirement_id = ?";

    db.query(checkRequirementSQL, [id], (err, results) => {
        if (err) {
            console.error("Error checking requirement:", err);
            return res.status(500).json({ message: "Error checking requirement" });
        }

        if (results[0].count === 0) {
            return res.status(404).json({ message: "Requirement not found" });
        }

        const disableFKChecks = "SET FOREIGN_KEY_CHECKS = 0";
        const enableFKChecks = "SET FOREIGN_KEY_CHECKS = 1";

        db.query(disableFKChecks, (disableErr) => {
            if (disableErr) {
                console.error(disableErr);
                return res.status(500).json({ message: "Error disabling foreign key checks" });
            }

            const deleteQueries = [
                { sql: "DELETE FROM verification WHERE JSON_CONTAINS(requirement_id, ?)", params: [`"${id}"`] },
                { sql: "DELETE FROM validation WHERE JSON_CONTAINS(requirement_id, ?)", params: [`"${id}"`] },
                { sql: "DELETE FROM testcase WHERE implement_id IN (SELECT implement_id FROM implementation WHERE design_id IN (SELECT design_id FROM design WHERE requirement_id = ?))", params: [id] },
                { sql: "DELETE FROM implementation WHERE design_id IN (SELECT design_id FROM design WHERE requirement_id = ?)", params: [id] },
                { sql: "DELETE FROM design WHERE requirement_id = ?", params: [id] },
                { sql: "DELETE FROM file_requirement_relation WHERE requirement_id = ?", params: [id] },
                { sql: "DELETE FROM baseline WHERE requirement_id = ?", params: [id] },
                { sql: "DELETE FROM historyreq WHERE requirement_id = ?", params: [id] },
                { sql: "DELETE FROM reviewer WHERE requirement_id = ?", params: [id] },
                { sql: "DELETE FROM requirement WHERE requirement_id = ?", params: [id] }
            ];

            const executeDeleteQueries = (index) => {
                if (index >= deleteQueries.length) {
                    db.query(enableFKChecks, () => {
                        return res.status(200).json({ message: "Requirement and related data deleted successfully" });
                    });
                    return;
                }

                const { sql, params } = deleteQueries[index];
                db.query(sql, params, (err) => {
                    if (err) {
                        console.error("Error executing query:", sql, err);
                        db.query(enableFKChecks);
                        return res.status(500).json({ message: "Error deleting related data" });
                    }
                    executeDeleteQueries(index + 1);
                });
            };

            executeDeleteQueries(0);
        });
    });
});



// Get requirements by project ID
app.get('/project/:id/requirement', (req, res) => {
    const sql = `
        SELECT 
            r.requirement_id,
            r.requirement_name,
            r.requirement_type,
            r.requirement_description,
            p.project_id
        FROM requirement r
        INNER JOIN project p ON r.project_id = p.project_id
        WHERE r.project_id = ? AND r.requirement_status = 'WORKING'
    `;
    const projectId = req.params.id;

    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching requirements');
        } else {
            res.status(200).json(results);
        }
    });
});

app.put('/requirement/:requirementId/status', (req, res) => {
    const { requirementId } = req.params;
    const { status } = req.body; // รับสถานะใหม่จากฟรอนต์เอนด์

    db.query(
        'UPDATE requirements SET requirement_status = ? WHERE requirement_id = ?',
        [status, requirementId],
        (err, result) => {
            if (err) {
                console.error('Error updating status:', err);
                res.status(500).send('Failed to update status.');
            } else {
                res.send({ message: 'Status updated successfully.' });
            }
        }
    );
});

// filter status VERIFIED AND VALIDATED
app.get("/api/requirements/", (req, res) => {
    const sqlQuery = "SELECT * FROM historyreq WHERE requirement_status IN ('VERIFIED', 'VALIDATED');";
  
    // ตัวอย่างการใช้งานแบบ Callback (เช่น ไลบรารี mysql)
    db.query(sqlQuery, (err, results) => {
      if (err) {
        console.error("Error querying database:", err);
        return res.status(500).json({ error: "Database query error" });
      }
      res.status(200).json(results); // ส่งผลลัพธ์กลับไปเป็น JSON
    });
  
  });
// ------------------------- File Requirement ---------------------------------

// API to fetch file data along with all requirement_ids
app.get("/api/file/:filereq_id", (req, res) => {
    const { filereq_id } = req.params;

    const query = `
        SELECT 
            fr.filereq_name, 
            fr.uploaded_at, 
            frr.requirement_id
        FROM 
            file_requirement AS fr
        JOIN 
            file_requirement_relation AS frr
            ON fr.filereq_id = frr.filereq_id
        WHERE 
            fr.filereq_id = ?
    `;

    db.query(query, [filereq_id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Error fetching data" });
        }
        res.json(results); // ส่งผลลัพธ์ที่มีหลาย requirement_id
    });
});

// API to fetch the file content (PDF or any other type)
app.get("/api/file/content/:filereq_id", (req, res) => {
    const { filereq_id } = req.params;

    const query = "SELECT filereq_data FROM file_requirement WHERE filereq_id = ?";
    db.query(query, [filereq_id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        const fileData = results[0].filereq_data;
        res.contentType("application/pdf");
        res.send(fileData);
    });
});

// ------------------------- Requirement Criteria -------------------------
// Fetch all criteria
app.get('/reqcriteria', (req, res) => {
    const { project_id } = req.query;
    let sql = "SELECT * FROM requirementcriteria";
    let params = [];

    if (project_id) {
        sql += " WHERE project_id = ?";
        params.push(project_id);
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Error fetching Requirement Criteria:', err);
            return res.status(500).send('Error fetching Requirement Criteria');
        }
        res.json(result);
    });
});


app.post('/reqcriteria', (req, res) => {
    const { reqcri_name, project_id } = req.body;

    if (!reqcri_name || reqcri_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }
    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = "INSERT INTO requirementcriteria (reqcri_name, project_id) VALUES (?, ?)";
    db.query(sql, [reqcri_name, project_id], (err, result) => {
        if (err) {
            console.error('Error creating criteria:', err);
            return res.status(500).json({ message: "Error creating criteria" });
        }
        res.status(201).json({ message: "Criteria created successfully", data: result });
    });
});


app.put('/reqcriteria/:id', (req, res) => {
    const { reqcri_name, project_id } = req.body;
    const { id } = req.params;

    if (!reqcri_name || reqcri_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }
    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = "UPDATE requirementcriteria SET reqcri_name = ? WHERE reqcri_id = ? AND project_id = ?";
    db.query(sql, [reqcri_name, id, project_id], (err, result) => {
        if (err) {
            console.error('Error updating criteria:', err);
            return res.status(500).json({ message: "Error updating criteria" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Criteria not found or project mismatch" });
        }
        res.status(200).json({ message: "Criteria updated successfully", data: result });
    });
});


app.delete('/reqcriteria/:id', (req, res) => {
    const { id } = req.params;
    const { project_id } = req.body; // หรือใช้ req.query ก็ได้

    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const checkSql = "SELECT * FROM requirementcriteria WHERE reqcri_id = ? AND project_id = ?";
    const deleteSql = "DELETE FROM requirementcriteria WHERE reqcri_id = ? AND project_id = ?";

    db.query(checkSql, [id, project_id], (err, result) => {
        if (err) {
            console.error('Error checking criteria:', err);
            return res.status(500).json({ message: "Error checking criteria" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Criteria not found or project mismatch" });
        }

        db.query(deleteSql, [id, project_id], (err, result) => {
            if (err) {
                console.error('Error deleting criteria:', err);
                return res.status(500).json({ message: "Error deleting criteria" });
            }
            res.status(200).json({ message: "Criteria deleted successfully" });
        });
    });
});

// ------------------------- Requirement Verified -------------------------
app.get('/project/:project_id/reqverified', (req, res) => {
    const { project_id } = req.params;

    const sql = "SELECT * FROM reqverified WHERE project_id = ?";
    const values = [project_id];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error fetching requirements" });
        }
        if (data.length === 0) {
            return res.status(404).json({ message: "No requirements found for this project" });
        }
        return res.status(200).json(data);
    });
});

app.get('/project/:id/reqverified', (req, res) => {
    const sql = `
        SELECT 
            r.reqver_id,
            r.reqver_name,
            p.project_id
        FROM reqverified r
        INNER JOIN project p ON r.project_id = p.project_id
        WHERE r.project_id = ?
    `;
    const projectId = req.params.id;

    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching requirements');
        } else {
            res.status(200).json(results);
        }
    });
});

app.put('/project/:id/reqverified', (req, res) => {
    const { id } = req.params; // รับ project_id จาก URL
    const { reqver_id, reqver_name, status } = req.body; // รับค่าที่ต้องการอัปเดตจาก body

    // คำสั่ง SQL สำหรับอัปเดตข้อมูล
    const sql = `
        UPDATE reqverified
        SET reqver_name = ?, status = ?
        WHERE reqver_id = ? AND project_id = ?
    `;

    // ส่งค่าไปยังฐานข้อมูล
    db.query(sql, [reqver_name, status, reqver_id, id], (err, result) => {
        if (err) {
            console.error("Error updating requirement:", err);
            return res.status(500).json({ message: "Error updating requirement" });
        }

        // ถ้าไม่มีแถวไหนถูกอัปเดต
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Requirement not found or no changes made" });
        }

        // ส่งข้อความว่าอัปเดตสำเร็จ
        res.status(200).json({ message: "Requirement updated successfully" });
    });
});

app.post('/reqverified', (req, res) => {
    const { reqver_name } = req.body;

    const sql = "INSERT INTO requirementverified (reqver_name) VALUES (?)";
    db.query(sql, [reqver_name], (err, result) => {
        if (err) {
            console.error('Error Requirement Verified:', err);
            return res.status(500).json({ message: "Error Requirement Verified" });
        }
        res.status(201).json({ message: "Requirement Verified created successfully", data: result });
    });
});


//-------------------------- VERIFICATION ------------------
// Create Verification
app.post('/createveri', (req, res) => {
    const { requirements, reviewers, project_id, create_by } = req.body;

    if (!requirements || !reviewers || !project_id || !create_by) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    const reviewersString = JSON.stringify(reviewers);
    const requirementsString = JSON.stringify(requirements); // รวม requirements เป็น JSON

    const createVerificationQuery =
        "INSERT INTO verification (project_id, create_by, requirement_id, verification_at, verification_by) VALUES (?, ?, ?, ?, ?)";

    const verificationValues = [
        project_id,
        create_by,
        requirementsString, // เก็บ requirements เป็น JSON
        new Date(), // เวลาปัจจุบัน
        reviewersString, // เก็บ reviewers เป็น JSON
    ];

    db.query(createVerificationQuery, verificationValues, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Error creating verification records." });
        }

        res.status(201).json({ message: "Verification created successfully!" });
    });
});

app.get('/verifications', (req, res) => {
    const { project_id, status } = req.query;

    let sql = `
      SELECT DISTINCT
        v.verification_id AS id,
        v.create_by,
        v.verification_at AS created_at,
        v.verification_by, -- ดึง column verification_by
        v.requirement_id,
        req.requirement_status AS requirement_status -- เพิ่มการดึง requirement_status จากตาราง requirement
      FROM verification v
      LEFT JOIN requirement req 
        ON JSON_CONTAINS(v.requirement_id, CAST(req.requirement_id AS JSON)) -- เชื่อมโยง requirement_id
      WHERE v.project_id = ?
    `;

    const params = [project_id];

    if (status) {
        sql += ` AND req.requirement_status = ?`; // ตรวจสอบสถานะ requirement
        params.push(status);
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Error fetching verifications.", error: err });
        }

        const verifications = result.map((row) => ({
            id: row.id,
            create_by: row.create_by,
            created_at: row.created_at,
            requirement_status: row.requirement_status || "UNKNOWN", // กำหนดค่าเริ่มต้น
            verification_by: row.verification_by ? JSON.parse(row.verification_by) : [], // แปลง verification_by จาก string เป็น array
            requirements: row.requirement_id ? JSON.parse(row.requirement_id) : [], // แปลง requirement_id จาก JSON string เป็น array
        }));

        return res.status(200).json(verifications);
    });
});


// Update verification status and requirements status
app.put('/update-status-verifications', (req, res) => {
    const { verification_ids, requirement_status } = req.body;

    if (!verification_ids || verification_ids.length === 0) {
        return res.status(400).json({ message: "No verification IDs provided." });
    }

    const sql = `UPDATE verification SET requirement_status = ? WHERE verification_id IN (?)`;

    db.query(sql, [requirement_status, verification_ids], (err, data) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Error updating verification statuses" });
        }
        return res.status(200).json({ message: "Verification statuses updated successfully" });
    });
});

app.put('/update-requirements-status-waitingfor-ver/:id', (req, res) => {
    const { id } = req.params;
    const { requirement_status } = req.body;

    if (!requirement_status) {
        return res.status(400).json({ message: "Missing requirement_status field." });
    }

    const query = `
      UPDATE requirement
      SET requirement_status = ?
      WHERE requirement_id = ?
    `;

    db.query(query, [requirement_status, id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Requirement not found." });
        }

        res.status(200).json({ message: "Requirement status updated successfully." });
    });
});

// Update multiple requirements status
app.put('/update-requirements-status-verified', (req, res) => {
    const { requirement_ids, requirement_status } = req.body;

    if (!requirement_ids || requirement_ids.length === 0) {
        return res.status(400).json({ message: "No requirement IDs provided." });
    }
    if (!requirement_status) {
        return res.status(400).json({ message: "Missing requirement_status field." });
    }

    const sql = `
        UPDATE requirement
        SET requirement_status = ?
        WHERE requirement_id IN (?)
    `;

    db.query(sql, [requirement_status, requirement_ids], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No requirements found to update." });
        }

        res.status(200).json({ message: "Requirement statuses updated successfully." });
    });
});


app.put('/update-verification-true', (req, res) => {
    const { verification_id, verification_by } = req.body;

    if (!verification_id || !Array.isArray(verification_by)) {
        return res.status(400).json({ message: "Invalid input data." });
    }

    // ตรวจสอบรูปแบบของ verification_by ให้มี ":"
    const isValidFormat = verification_by.every((entry) => {
        return typeof entry === "string" && entry.includes(":");
    });

    if (!isValidFormat) {
        return res.status(400).json({ message: "Invalid verification_by format." });
    }

    const sql = `
      UPDATE verification
      SET verification_by = ?
      WHERE verification_id = ?
    `;

    db.query(sql, [JSON.stringify(verification_by), verification_id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Failed to update verification_by." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Verification not found." });
        }

        res.status(200).json({ message: "Verification updated successfully." });
    });
});

// ในไฟล์ Backend (เช่น index.js)
app.get('/verification-history/:project_id', (req, res) => { // เปลี่ยนเป็น Callback ธรรมดา ไม่ต้อง async
    const projectId = req.params.project_id;

    if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }

    // --- SQL Query (เหมือนเดิม) ---
    const query = `
        SELECT
            verification_id AS id,
            project_id,
            create_by,
            requirement_id,
            verification_at,
            verification_by
        FROM
            verification
        WHERE
            project_id = ?
        ORDER BY
            verification_at DESC;
    `;

    // --- Execute Query using Callback ---
    db.query(query, [projectId], (error, results, fields) => {
        // 1. ตรวจสอบ Error จาก Database ก่อน
        if (error) {
            console.error('Database query error:', error);
            return res.status(500).json({
                message: 'Database query failed.',
                error_code: error.code,
                error_details: error.sqlMessage || error.message
            });
        }

        // 2. ถ้าไม่มี Error, Process ผลลัพธ์ (results)
        try {
            const processedResults = results.map(item => {
                let requirements = [];
                let verificationBy = [];
                // Parse requirement_id
                try {
                    if (item.requirement_id) {
                        requirements = JSON.parse(item.requirement_id);
                        if (!Array.isArray(requirements)) requirements = [];
                    }
                } catch (e) {
                    console.error(`Error parsing requirement_id JSON for verification ${item.id}:`, e);
                    requirements = [];
                }
                // Parse verification_by
                try {
                    if (item.verification_by) {
                        verificationBy = JSON.parse(item.verification_by);
                        if (!Array.isArray(verificationBy)) verificationBy = [];
                    }
                } catch (e) {
                    console.error(`Error parsing verification_by JSON for verification ${item.id}:`, e);
                    verificationBy = [];
                }
                return {
                    ...item,
                    requirements: requirements,
                    verification_by: verificationBy
                };
            });
            // 3. ส่งผลลัพธ์ที่ Process แล้วกลับไป
            res.status(200).json(processedResults);

        } catch (processingError) {
            // 4. จัดการ Error ที่อาจเกิดตอน Process ผลลัพธ์ (เช่น JSON.parse ผิดพลาด)
            console.error('Error processing database results:', processingError);
            res.status(500).json({
                 message: 'Error processing database results.',
                 error_details: processingError.message
            });
        }
    }); // End of db.query callback
}); // End of app.get
//-------------------------- VALIDATION ------------------
// Create Validation
app.post('/createvalidation', async (req, res) => {
    const { requirements, create_by, project_id } = req.body;

    if (!requirements || !create_by || !project_id) {
        return res.status(400).json({ message: "Missing required fields." });
    }

    const createValidationQuery =
        "INSERT INTO validation (requirement_id, create_by, validation_at, requirement_status, project_id) VALUES (?, ?, ?, ?, ?)";
    const updateRequirementStatusQuery =
        "UPDATE requirement SET requirement_status = ? WHERE requirement_id IN (?)";

    try {
        // Begin a transaction
        await db.beginTransaction();

        // Insert validation record with JSON array of requirements
        await db.query(createValidationQuery, [
            JSON.stringify(requirements), // Convert requirements array to JSON
            create_by,
            new Date(),
            "WAITING FOR VALIDATION",
            project_id
        ]);

        // Update requirement statuses for all selected requirements
        await db.query(updateRequirementStatusQuery, [
            "WAITING FOR VALIDATION",
            requirements,
        ]);

        // Commit transaction
        await db.commit();

        res.status(201).json({ message: "Validation created and statuses updated successfully!" });
    } catch (err) {
        console.error("Error during validation creation:", err);

        // Rollback transaction if any error occurs
        await db.rollback();

        res.status(500).json({ message: "Error creating validation or updating statuses." });
    }
});


app.get('/validations', (req, res) => {
    const { project_id, status } = req.query;

    let sql = `
      SELECT 
        v.validation_id AS id,
        v.create_by,
        v.validation_at AS created_at,
        v.requirement_id,
        v.project_id, -- เพิ่ม project_id ในผลลัพธ์
        GROUP_CONCAT(DISTINCT req.requirement_status) AS requirement_status
      FROM validation v
      LEFT JOIN requirement req ON JSON_CONTAINS(v.requirement_id, CAST(req.requirement_id AS JSON), '$')
      WHERE 1 = 1
    `;

    const params = [];

    // Filter by project_id if provided
    if (project_id) {
        sql += ` AND v.project_id = ?`;
        params.push(project_id);
    }

    // Filter by status if provided
    if (status) {
        sql += ` AND req.requirement_status = ?`;
        params.push(status);
    }

    sql += ` GROUP BY v.validation_id`; // รวมผลลัพธ์ตาม validation_id

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Error fetching validations.", error: err });
        }

        const validations = result.map((row) => ({
            id: row.id,
            create_by: row.create_by,
            created_at: row.created_at,
            project_id: row.project_id, // ส่งค่า project_id กลับไปด้วย
            requirement_status: row.requirement_status,
            requirements: row.requirement_id ? JSON.parse(row.requirement_id) : [],
        }));
        console.log("Result from database:", validations); // ตรวจสอบข้อมูลก่อนส่ง
        return res.status(200).json(validations);
    });
});



// Update multiple requirements status
app.put('/update-requirements-status-validated', (req, res) => {
    const { requirement_ids, requirement_status } = req.body;

    if (!requirement_ids || requirement_ids.length === 0) {
        return res.status(400).json({ message: "No requirement IDs provided." });
    }
    if (!requirement_status) {
        return res.status(400).json({ message: "Missing requirement_status field." });
    }

    const sql = `
        UPDATE requirement
        SET requirement_status = ?
        WHERE requirement_id IN (?)
    `;

    db.query(sql, [requirement_status, requirement_ids], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No requirements found to update." });
        }

        res.status(200).json({ message: "Requirement statuses updated successfully." });
    });
});

// GET /api/requirements/:requirementId/comments - ดึงข้อมูลความคิดเห็นทั้งหมดสำหรับ requirement ที่ระบุ
app.get('/api/requirements/:requirementId/comments', (req, res) => {
    const { requirementId } = req.params;
    console.log("✅ Fetching comments for requirement ID:", requirementId);

    // เลือกเฉพาะข้อมูลที่เกี่ยวกับ comment
    const query = `
        SELECT
            c.comment_var_id,  -- เพิ่ม ID เพื่อเป็น key ที่ดี
            c.member_name,
            c.comment_var_text,
            c.comment_var_at
        FROM
            comment_var c
        WHERE
            c.requirement_id = ?
        ORDER BY
            c.comment_var_at DESC;
    `;
    console.log("📄 Executing Comments Query:", query, "with parameter:", requirementId);

    db.query(query, [requirementId], (error, results, fields) => {
        if (error) {
            console.error("❌ Error fetching comments:", error);
            res.status(500).json({ message: "Database query failed while fetching comments", error: error.message });
            return;
        }

        console.log("💬 Comments Query Results:", results);
        // ส่งผลลัพธ์กลับไปได้เลย ไม่ต้องแปลง Base64
        res.json(results);
    });
});

// GET /api/requirements/:requirementId/files - ดึงประวัติไฟล์สำหรับ requirement ที่ระบุ
app.get('/api/requirements/:requirementId/files', (req, res) => {
    const { requirementId } = req.params;
    console.log("✅ Fetching file history for requirement ID:", requirementId);

    // เลือกเฉพาะข้อมูลที่เกี่ยวกับ file_validation
    // เพิ่ม timestamp ของ file_validation เองด้วย (ถ้ามี) เพื่อการเรียงลำดับที่แม่นยำขึ้น
    const query = `
        SELECT
            f.file_validation_id, -- เพิ่ม ID เพื่อเป็น key ที่ดี
            f.filereq_data
            -- f.created_at หรือ f.validated_at (ถ้ามีคอลัมน์ timestamp)
        FROM
            file_validation f
        WHERE
            f.requirement_id = ?
        ORDER BY
            f.file_validation_id DESC; -- หรือเรียงตาม timestamp ของไฟล์ถ้ามี
            -- f.created_at DESC หรือ f.validated_at DESC
    `;
    console.log("📄 Executing Files Query:", query, "with parameter:", requirementId);

    db.query(query, [requirementId], (error, results, fields) => {
        if (error) {
            console.error("❌ Error fetching file history:", error);
            res.status(500).json({ message: "Database query failed while fetching file history", error: error.message });
            return;
        }

        // --- **** ส่วนการแปลง Buffer เป็น Base64 **** ---
        // (เหมือนเดิม แต่ตอนนี้ทำเฉพาะกับข้อมูลไฟล์)
        if (results && results.length > 0) {
            results.forEach(row => {
                if (row.filereq_data && row.filereq_data instanceof Buffer) {
                    row.filereq_data = row.filereq_data.toString('base64');
                }
            });
        }
        // --- **** สิ้นสุดส่วนการแปลง **** ---

        console.log("📁 File History Query Results (after base64 conversion):", results);
        // ส่ง results ที่แปลง filereq_data เป็น base64 แล้วกลับไป
        res.json(results);
    });
});

// -------------- SAVE CRI_REQUIREMENT --------------------

// Endpoint: /vericri_req
app.post("/vericri_req", (req, res) => {
  // 1. เอา verification_id ออกจาก destructuring
  const { project_id, reqcri_name, requirement_id, requirement_name, requirement_description, requirement_type } = req.body;

  // 2. เอา !verification_id ออกจากการตรวจสอบ (ถ้ายังต้องการเช็คค่าอื่น ก็คงไว้)
  if (!project_id || !reqcri_name || !requirement_id || !requirement_name || !requirement_description || !requirement_type) {
    // ถ้า reqcri_names อาจเป็นค่าว่างได้ ก็อาจจะต้องเอา !reqcri_names ออกด้วย
    return res.status(400).json({ error: "Missing required data for vericri_req" }); 
  }

  // 3. เอา verification_id ออกจาก SQL INSERT (ทั้งชื่อคอลัมน์ และ ?)
  const sql = `INSERT INTO vericri_req (project_id, reqcri_name, requirement_id, requirement_name, requirement_description, requirement_type) VALUES (?, ?, ?, ?, ?, ?)`;
  
  // 4. เอา verification_id ออกจาก array ของ values
  const values = [project_id, reqcri_name, requirement_id, requirement_name, requirement_description, requirement_type];

  // ส่วน db.query ยังคงเดิม
  db.query(sql, values, (err, result) => {
    if (err) {
      // ถ้า Error ตรงนี้ อาจจะเป็นเพราะ Database Schema ไม่ตรงกับ SQL ใหม่
      console.error("Database error inserting vericri_req:", err); 
      return res.status(500).json({ error: "Database error processing vericri_req" });
    }
    res.json({ success: true, message: "vericri_req data saved." }); // ส่ง response ที่สื่อความหมายมากขึ้น (optional)
  });
});
    

  app.get('/vericri_req', (req, res) => {
    const { project_id, requirement_id } = req.query;

    // ตรวจสอบว่ามีค่า project_id และ requirement_id หรือไม่
    if (!project_id || !requirement_id) {
        return res.status(400).json({ error: 'Missing project_id or requirement_id' });
    }

    // คิวรีข้อมูลโดยใช้ JOIN กับตาราง verification
    const sql = `
      SELECT vq.vericri_req, vq.project_id, vq.reqcri_name, vq.requirement_id,
             v.verification_id,v.verification_at , v.verification_by
      FROM vericri_req vq
      JOIN verification v ON vq.project_id = v.project_id
                         AND JSON_CONTAINS(v.requirement_id, CAST(vq.requirement_id AS JSON), '$')
      WHERE vq.project_id = ? AND vq.requirement_id = ?
    `;

    db.query(sql, [project_id, requirement_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// -------------------------- SAVE CRI_DESIGN ------------------------
// 📌 GET: ดึงข้อมูลทั้งหมดจาก `vericri_design`
// รองรับการ filter ด้วย project_id (บังคับ) และ design_id (ทางเลือก)
app.get('/vericri_design', (req, res) => {
    const { project_id, design_id } = req.query;

    // 1. ตรวจสอบ project_id
    if (!project_id) {
        return res.status(400).json({ error: 'Missing required query parameter: project_id' });
    }

    // 2. สร้าง SQL Query เริ่มต้น (มีแค่ project_id)
    let sql = `
      SELECT
          vdc.vericri_design_id, vdc.project_id, vdc.designcri_name, vdc.design_id,
          vdc.design_type, vdc.diagram_type, vdc.diagram_name, vdc.design_description,
          vd.veridesign_id, vd.veridesign_round, vd.create_by,
          vd.veridesign_at, vd.veridesign_by
      FROM
          vericri_design vdc
      LEFT JOIN
          veridesign vd ON vdc.project_id = vd.project_id AND vdc.design_id = vd.design_id
      WHERE
          vdc.project_id = ?  -- <<< WHERE เริ่มต้นมีแค่ project_id
    `;

    // 3. เตรียม Parameter เริ่มต้น
    const params = [project_id]; // <<< เริ่มต้นด้วย project_id เท่านั้น

    // 4. เพิ่มเงื่อนไขและ Parameter ของ design_id ถ้ามี
    if (design_id) {
        sql += ' AND vdc.design_id = ?'; // <<< เพิ่มส่วน AND ... เข้าไปใน SQL
        params.push(design_id);           // <<< เพิ่มค่า design_id เข้าไปใน params
    }

    // 5. Execute SQL Query
    db.query(sql, params, (err, rows) => { // <-- params จะมี 1 หรือ 2 ตัว สอดคล้องกับ '?' ใน sql
        if (err) {
            console.error("Database Query Error:", err.message);
            // เพิ่มการ log ตัว SQL และ Params ตอนเกิด Error เพื่อช่วย Debug
            console.error("SQL:", sql);
            console.error("Params:", params);
            return res.status(500).json({ error: 'Database query failed', details: err.message });
        }
        res.json(rows);
    });
});

// 📌 POST: เพิ่มข้อมูลลง `vericri_design`
app.post("/vericri_design", (req, res) => {
    const { project_id, designcri_name, design_id, design_type, diagram_type, diagram_name, design_description } = req.body;
    const sql = `INSERT INTO vericri_design (project_id, designcri_name, design_id, design_type, diagram_type, diagram_name, design_description) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [project_id, designcri_name, design_id, design_type, diagram_type, diagram_name, design_description], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "✅ Inserted Successfully!", insertId: result.insertId });
    });
});

// ------------------------- Login -------------------------
app.get('/login', (req, res) => {
    const sql = "SELECT * FROM login";
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching:', err);
            return res.status(500).send('Error fetching');
        }
        res.json(result);  // Send the result as JSON
    });
});

app.post('/signup', (req, res) => {
    console.log('Request Body:', req.body); // ดูข้อมูลที่ส่งมา
    const sql = `
            INSERT INTO login 
            (user_name, user_password) 
            VALUES (?, ?)
        `;
    const values = [
        req.body.user_name,
        req.body.user_password
    ];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Database Error:', err); // แสดง Error ใน Console
            return res.status(500).json({ message: "Error adding project" });
        }
        return res.status(200).json({ message: "Project added successfully", data });
    });
});

app.post('/login', (req, res) => {
    const { user_name, user_password } = req.body;

    if (!user_name || !user_password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    const sql = "SELECT * FROM login WHERE user_name = ? AND user_password = ?";
    db.query(sql, [user_name, user_password], (err, result) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (result.length > 0) {
            return res.status(200).json({ message: "Login successful", user: result[0] });
        } else {
            return res.status(401).json({ message: "Invalid username or password" });
        }
    });
});


// ------------------------- File Upload -------------------------
// Upload file
app.post("/upload", upload.single("file"), (req, res) => {
    const { title, project_id } = req.body;  // รับค่าจาก form data
    const file = req.file;

    // ตรวจสอบว่าไฟล์ถูกส่งมา
    if (!file) {
        return res.status(400).json({ message: "Please upload a file." });
    }

    // ตรวจสอบว่า title ถูกกรอกหรือไม่
    if (!title) {
        return res.status(400).json({ message: "Title is required." });
    }

    // ตรวจสอบว่าไฟล์เป็น PDF
    if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ message: "Only PDF files are allowed." });
    }

    // ตรวจสอบขนาดไฟล์
    if (file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File size exceeds 10MB." });
    }

    // ตรวจสอบว่า project_id มีค่า
    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required." });
    }

    const sql = "INSERT INTO file_requirement (filereq_name, filereq_data, project_id) VALUES (?, ?, ?)";
    const values = [title, file.buffer, project_id];  // ส่งค่า project_id

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting file:", err);
            return res.status(500).json({ message: "Failed to save file." });
        }
        res.status(200).json({ message: "File uploaded successfully.", fileId: result.insertId });
    });
});


app.get('/files', (req, res) => {
    const { project_id } = req.query; // รับค่า project_id จาก query parameters

    if (!project_id) {
        return res.status(400).json({ message: "project_id is required" });
    }

    // SQL สำหรับการ JOIN file_requirement และ file_requirement_relation
    const sql = `
        SELECT 
            fr.filereq_id, 
            fr.filereq_name, 
            COALESCE(GROUP_CONCAT(frr.requirement_id), '[]') AS requirement_ids
        FROM file_requirement fr
        LEFT JOIN file_requirement_relation frr ON fr.filereq_id = frr.filereq_id
        WHERE fr.project_id = ?
        GROUP BY fr.filereq_id, fr.filereq_name;
    `;

    db.query(sql, [project_id], (err, result) => {
        if (err) {
            console.error('Error fetching files:', err);
            return res.status(500).json({ message: "Error fetching files" });
        }

        // แปลง requirement_ids จาก String เป็น Array
        const formattedResult = result.map(file => ({
            ...file,
            requirement_ids: file.requirement_ids ? file.requirement_ids.split(',').map(id => Number(id)) : []
        }));

        res.json(formattedResult);
    });
});


app.get('/filename', (req, res) => {
    const sql = "SELECT filereq_id, filereq_name FROM file_requirement"; // เลือก filereq_id และ filereq_name
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching Requirement Criteria:', err);
            return res.status(500).send('Error fetching Requirement Criteria');
        }
        res.json(result); // ส่งผลลัพธ์ให้ client
    });
});




app.get("/files/:id", (req, res) => {
    const fileId = req.params.id;

    console.log("Requested File ID:", fileId); // ตรวจสอบค่าที่รับมา

    const sql = "SELECT filereq_name, filereq_data FROM file_requirement WHERE filereq_id = ?";
    db.query(sql, [fileId], (err, results) => {
        if (err) {
            console.error("Error fetching file:", err);
            return res.status(500).send("Internal Server Error");
        }

        if (results.length === 0) {
            console.warn("File not found for ID:", fileId);
            return res.status(404).send("File not found");
        }

        const file = results[0];
        if (!file.filereq_data) {
            console.warn("No file data for ID:", fileId);
            return res.status(404).send("No file data available");
        }

        const fileName = encodeURIComponent(file.filereq_name || "download.pdf");
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

        res.send(file.filereq_data);
    });
});




// ลบไฟล์
app.delete('/files/:fileId', (req, res) => {
    const fileId = req.params.fileId; // รับ fileId จาก URL
    const sql = "DELETE FROM file_requirement WHERE filereq_id = ?";

    db.query(sql, [fileId], (err, result) => {
        if (err) {
            console.error('Error deleting file:', err);
            return res.status(500).send('Error deleting file');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('File not found');
        }

        res.status(200).send('File deleted successfully');
    });
});

// ----------------------- File Validation -----------------------
// อัปโหลดไฟล์
app.post("/uploadfile-var", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).send("No file uploaded.");
    }

    const fileDataHex = req.file.buffer.toString("hex"); // แปลงไฟล์เป็น HEX
    const projectId = parseInt(req.body.project_id, 10);
    const requirementId = parseInt(req.body.requirement_id, 10);

    // ตรวจสอบว่า projectId และ requirementId ถูกส่งมาหรือไม่
    if (isNaN(projectId) || isNaN(requirementId)) {
        return res.status(400).send("Invalid project_id or requirement_id.");
    }

    const query = `INSERT INTO file_validation (filereq_data, upload_at, project_id, requirement_id) VALUES (UNHEX(?), NOW(), ?, ?)`;

    db.query(query, [fileDataHex, projectId, requirementId], (err, result) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send("Database error");
        }
        res.send("File uploaded and saved successfully.");
    });
});
app.get("/get-uploaded-files", (req, res) => {
    const requirementId = parseInt(req.query.requirement_id, 10);

    if (isNaN(requirementId)) {
        return res.status(400).send("Invalid requirement_id.");
    }

    const query = `SELECT * FROM file_validation WHERE requirement_id = ?`;

    db.query(query, [requirementId], (err, results) => {
        if (err) {
            console.error("Database error: ", err);
            return res.status(500).send("Database error");
        }
        res.json(results);
    });
});

// ดาวน์โหลดไฟล์
app.get("/download-file-var/:id", (req, res) => {
    const fileId = req.params.id;

    const sql = "SELECT requirement_name, filereq_data FROM file_validation WHERE file_validation_id = ?";
    db.query(sql, [fileId], (err, results) => {
        if (err) {
            console.error("Error fetching file:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "File not found." });
        }

        const file = results[0];
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${file.requirement_name}"`
        );
        res.send(Buffer.from(file.filereq_data, "base64"));
    });
});

// ลบไฟล์
app.delete("/delete-files-var/:fileId", (req, res) => {
    const fileId = req.params.fileId;

    const sql = "DELETE FROM file_validation WHERE file_validation_id = ?";
    db.query(sql, [fileId], (err, result) => {
        if (err) {
            console.error("Error deleting file:", err);
            return res.status(500).json({ message: "Error deleting file." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "File not found." });
        }

        res.status(200).json({ message: "File deleted successfully." });
    });
});

// ------------------------- COMMENT -------------------------

// ดึง Comment ทั้งหมดตาม Verification ID และ Requirement ID
app.get('/api/comments', (req, res) => {
    const { verificationId, requirementId } = req.query;

    if (!verificationId || !requirementId) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    const sql = `
        SELECT * FROM comment 
        WHERE verification_id = ? AND requirement_id = ?
    `;
    db.query(sql, [verificationId, requirementId], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).json({ message: 'Failed to fetch comments' });
        }
        res.status(200).json(results);
    });
});

// เพิ่ม Comment ใหม่
app.post('/api/comments', (req, res) => {
    const { reviewer_id, reviewer_name, content, verification_id, requirement_id } = req.body;

    // ตรวจสอบว่าค่าที่จำเป็นครบถ้วน
    if (!reviewer_id || !reviewer_name || !content || !verification_id || !requirement_id) {
        console.error('Missing required fields:', { reviewer_id, reviewer_name, content, verification_id, requirement_id });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const sql = `
        INSERT INTO comment (reviewer_id, reviewer_name, content, verification_id, requirement_id, comment_time)
        VALUES (?, ?, ?, ?, ?, NOW())
    `;
    const values = [reviewer_id, reviewer_name, content, verification_id, requirement_id];

    console.log('Executing SQL:', sql, values);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error adding comment:', err);
            return res.status(500).json({ message: 'Failed to add comment' });
        }

        const newComment = {
            id: result.insertId,
            reviewer_id,
            reviewer_name,
            content,
            verification_id,
            requirement_id,
            comment_time: new Date(),
        };

        console.log('Added comment:', newComment);
        res.status(201).json(newComment);
    });
});


// ลบ Comment ตาม ID
app.delete('/api/comments/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM comment WHERE comment_id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting comment:', err);
            return res.status(500).json({ message: 'Failed to delete comment' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.status(200).json({ message: 'Comment deleted successfully' });
    });
});

// อัปเดต Comment ตาม ID
app.put('/api/comments/:id', (req, res) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Content is required' });
    }

    const sql = `
        UPDATE comment 
        SET content = ?, comment_time = NOW()
        WHERE comment_id = ?
    `;
    db.query(sql, [content, id], (err, result) => {
        if (err) {
            console.error('Error updating comment:', err);
            return res.status(500).json({ message: 'Failed to update comment' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        res.status(200).json({ message: 'Comment updated successfully' });
    });
});

app.post('/api/comments', (req, res) => {
    console.log('Request body received:', req.body); // เพิ่ม Log ดู Request
    const { reviewer_id, reviewer_name, content, verification_id, requirement_id } = req.body;

    if (!reviewer_id || !reviewer_name || !content || !verification_id || !requirement_id) {
        console.error('Missing required fields:', { reviewer_id, reviewer_name, content, verification_id, requirement_id });
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const sql = `INSERT INTO comment (reviewer_id, reviewer_name, content, verification_id, requirement_id, comment_time)
                 VALUES (?, ?, ?, ?, ?, NOW())`;

    const values = [reviewer_id, reviewer_name, content, verification_id, requirement_id];
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error executing SQL:', err);
            return res.status(500).json({ message: 'Failed to add comment' });
        }

        console.log('Comment added successfully:', result);
        res.status(201).json({ id: result.insertId, ...req.body, comment_time: new Date() });
    });
});


// ------------------------- VERSION CONTROL -------------------------
// Endpoint to fetch history for a specific criteria
app.post("/reqcriteria/log", (req, res) => {
    const { reqcri_id, action, modified_by } = req.body;
    const query = `
        INSERT INTO history (reqcri_id, action, modified_by, modified_at)
        VALUES (?, ?, ?, NOW());
    `;
    db.query(query, [reqcri_id, action, modified_by], (err, result) => {
        if (err) {
            console.error("Error logging action:", err);
            return res.status(500).json({ error: "Failed to log action." });
        }
        res.json({ message: "Action logged successfully." });
    });
});



//-------------------------- VERIFICATION COMMENT ------------------------------------
// Get all comments
app.get('/allcomment', (req, res) => {
    const verificationId = req.query.verification_id; // ดึง verification_id จาก query string
    console.log('Received verification_id:', verificationId); // ตรวจสอบค่าที่รับมา

    // SQL Query ดึงคอมเมนต์และการตอบกลับที่เกี่ยวข้อง
    const sql = `
        SELECT 
            c.comment_id, 
            c.member_name AS comment_member_name, 
            c.comment_text, 
            c.comment_at,
            r.ver_replies_id, 
            r.ver_replies_text, 
            r.member_name AS reply_member_name, 
            r.ver_replies_at
        FROM 
            comme_member c
        LEFT JOIN 
            ver_comment_replies r 
        ON 
            c.comment_id = r.comment_id
        WHERE 
            c.verification_id = ?
    `;

    db.query(sql, [verificationId], (err, results) => {
        if (err) {
            console.error('Error fetching comments:', err);
            return res.status(500).send('Error fetching comments');
        }

        // จัดกลุ่มข้อมูลคอมเมนต์และการตอบกลับ
        const groupedResults = results.reduce((acc, row) => {
            const commentId = row.comment_id;

            if (!acc[commentId]) {
                acc[commentId] = {
                    comment_id: row.comment_id,
                    member_name: row.comment_member_name,
                    comment_text: row.comment_text,
                    comment_at: row.comment_at,
                    replies: []
                };
            }

            if (row.ver_replies_id) {
                acc[commentId].replies.push({
                    ver_replies_id: row.ver_replies_id,
                    ver_replies_text: row.ver_replies_text,
                    member_name: row.reply_member_name,
                    ver_replies_at: row.ver_replies_at
                });
            }

            return acc;
        }, {});

        const comments = Object.values(groupedResults);
        console.log('Fetched comments with replies:', comments); // ตรวจสอบข้อมูลที่ได้
        res.json(comments);
    });
});

app.post('/comments', (req, res) => {
    const { member_id, member_name, comment_text, verification_id } = req.body;  // รับค่า emoji จาก body
    console.log('Received data:', req.body); // ตรวจสอบข้อมูลที่รับมา

    // เพิ่มข้อมูลอีโมจิในคำสั่ง SQL
    const sql = 'INSERT INTO comme_member (member_id, member_name, comment_text, verification_id) VALUES ( ?, ?, ?, ?)';

    db.query(sql, [member_id, member_name, comment_text, verification_id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error adding comment');
        } else {
            res.status(201).send('Comment added successfully');
        }
    });
});


// Update comment
app.put('/comments/:comme_member_id', (req, res) => {
    const { comme_member_id } = req.params;
    const { comment_text } = req.body;
    const sql = 'UPDATE comme_member SET comment_text = ? WHERE comme_member_id = ?';
    db.query(sql, [comment_text, comme_member_id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error updating comment');
        } else {
            res.send('Comment updated successfully');
        }
    });
});

app.delete('/deletecomment/:commentId', (req, res) => {
    const { commentId } = req.params;  // ดึง commentId จาก params

    // ลบการตอบกลับที่เกี่ยวข้องจาก ver_comment_replies
    const deleteRepliesSql = 'DELETE FROM ver_comment_replies WHERE comment_id = ?';
    db.query(deleteRepliesSql, [commentId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error deleting replies');
        }

        // หลังจากลบการตอบกลับแล้ว ลบคอมเมนต์จาก comme_member
        const deleteCommentSql = 'DELETE FROM comme_member WHERE comment_id = ?';
        db.query(deleteCommentSql, [commentId], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error deleting comment');
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Comment not found');
            }
            res.send('Comment deleted successfully');
        });
    });
});

//-------------------------- VALIDATION COMMENT ----------------------
// Get all comments
// ดึงคอมเมนต์จาก validation_id
app.get('/showvalicomment', (req, res) => {
    const validationId = req.query.validation_id; // ดึง validation_id จาก query string
    console.log('Received validation_id:', validationId); // ตรวจสอบ validation_id
    const sql = 'SELECT * FROM comment_var WHERE validation_id = ?';

    db.query(sql, [validationId], (err, results) => {
        if (err) {
            console.error('Error fetching comment:', err);
            return res.status(500).send('Error fetching comment');
        }
        console.log('Fetched comment:', results); // ตรวจสอบข้อมูลที่ได้
        res.json(results);
    });
});

app.post('/createvarcomment', (req, res) => {
    const { member_name, comment_var_text, validation_id, requirement_id } = req.body;
    console.log('Received data:', req.body); // ตรวจสอบข้อมูลที่รับมา

    // คำสั่ง SQL ที่ปรับใหม่
    const sql = 'INSERT INTO comment_var (member_name, comment_var_text, validation_id, requirement_id) VALUES (?, ?, ?, ?)';

    db.query(sql, [member_name, comment_var_text, validation_id, requirement_id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error adding comment');
        } else {
            res.status(201).send('Comment added successfully');
        }
    });
});

// Update comment - แก้ไข Route, Table, Columns
app.put('/var_comment/:commentId', (req, res) => { // 1. เพิ่ม :commentId ใน route path
    const { commentId } = req.params;             // 2. ดึง commentId จาก req.params
    const { comment_var_text } = req.body;        // 3. ดึง comment_var_text จาก req.body

    // เพิ่มการตรวจสอบว่า comment_var_text มีค่าหรือไม่
    if (!comment_var_text || comment_var_text.trim() === '') {
        return res.status(400).send('Comment text cannot be empty');
    }

    // 4. แก้ไข SQL query ให้ใช้ตารางและคอลัมน์ที่ถูกต้อง
    const sql = 'UPDATE comment_var SET comment_var_text = ? WHERE comment_id = ?';

    // 5. ใช้ [comment_var_text, commentId] เป็นพารามิเตอร์
    db.query(sql, [comment_var_text, commentId], (err, result) => {
        if (err) {
            console.error('Error updating comment:', err);
            res.status(500).send('Error updating comment');
        } else if (result.affectedRows === 0) {
             // เพิ่มการตรวจสอบว่ามีการ update เกิดขึ้นจริงหรือไม่ (commentId นั้นมีอยู่จริงหรือไม่)
            res.status(404).send('Comment not found or no change made');
        } else {
            res.status(200).send('Comment updated successfully'); // ใช้ status 200 OK
        }
    });
});

// Delete comment - แก้ไข Table Name
// --- Delete Comment Endpoint ---
// ตรวจสอบว่าคุณมีตัวแปร app (Express instance) และ db (Database connection) อยู่แล้ว

app.delete('/deletecomments/:commentId', (req, res) => {
    // 1. ดึง commentId จาก URL parameter ที่ส่งมาจาก frontend
    const commentId = req.params.commentId;
  
    // 2. ตรวจสอบเบื้องต้นว่า commentId มีค่าหรือไม่
    if (!commentId) {
      // ถ้าไม่มี ID ส่งมา ให้ตอบกลับเป็น Bad Request (400)
      return res.status(400).json({ success: false, message: 'Comment ID is required.' });
    }
  
    // 3. สร้าง SQL query สำหรับลบข้อมูล
    // *** ใช้ชื่อตาราง `comment_var` และชื่อคอลัมน์ `comment_var_id` ตามรูป ***
    const sql = "DELETE FROM comment_var WHERE comment_var_id = ?";
  
    // 4. สั่งให้ database ทำงาน (execute query)
    // ส่ง commentId เข้าไปเป็น parameter เพื่อป้องกัน SQL Injection
    db.query(sql, [commentId], (err, result) => {
      // 5. จัดการกับ Error ที่อาจเกิดขึ้นจาก Database
      if (err) {
        console.error("Error deleting comment from database:", err);
        // ตอบกลับเป็น Internal Server Error (500) ถ้ามีปัญหาที่ database
        return res.status(500).json({ success: false, message: 'Database error occurred while deleting comment.' });
      }
  
      // 6. ตรวจสอบว่ามีการลบข้อมูลเกิดขึ้นจริงหรือไม่
      // result.affectedRows จะบอกจำนวนแถวที่ได้รับผลกระทบ (ถูกลบ)
      if (result.affectedRows === 0) {
        // ถ้า affectedRows เป็น 0 แสดงว่าไม่พบคอมเมนต์ ID นั้นในตาราง
        return res.status(404).json({ success: false, message: 'Comment not found.' });
      }
  
      // 7. ถ้าทุกอย่างสำเร็จ
      console.log(`Successfully deleted comment with ID: ${commentId}`);
      // ตอบกลับด้วย status 200 OK และข้อความยืนยัน
      res.status(200).json({ success: true, message: 'Comment deleted successfully.' });
    });
  });
  
  // --- อย่าลืม export app หรือ start server ของคุณ ---

app.post('/comments', (req, res) => {
    const { member_name, comment_var_text } = req.body;

    // ตรวจสอบข้อมูลก่อนทำการ INSERT
    console.log("Received data:", { member_name, comment_var_text });

    const sql = 'INSERT INTO comme_member (member_name, comment_text) VALUES (?, ?, ?)';
    db.query(sql, [member_name, comment_var_text], (err, results) => {
        if (err) {
            console.error("Error inserting comment:", err);
            res.status(500).send('Failed to insert comment.');
        } else {
            res.status(201).json({ comment_var_id: results.insertId });
        }
    });
});

app.post("/uploadfile-var", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    let { requirement_id, project_id } = req.body;

    // ✅ แปลงค่าให้เป็นตัวเลขและตรวจสอบให้แน่ใจว่าไม่ใช่ NaN
    requirement_id = parseInt(requirement_id, 10);
    project_id = parseInt(project_id, 10);

    if (isNaN(requirement_id) || isNaN(project_id)) {
        return res.status(400).json({ message: "Invalid project_id or requirement_id." });
    }

    const fileBuffer = fs.readFileSync(req.file.path);

    const sql = `INSERT INTO file_validation (requirement_id, project_id, filereq_data, upload_at) VALUES (?, ?, ?, NOW())`;

    db.query(sql, [requirement_id, project_id, fileBuffer], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error: " + err.message });
        }

        fs.unlinkSync(req.file.path);
        res.status(201).json({ message: "File uploaded successfully", insertId: result.insertId });
    });
});


// 📌 API ดาวน์โหลดไฟล์
app.get("/getfile/:fileId", (req, res) => {
    const fileId = parseInt(req.params.fileId, 10);

    if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
    }

    const sql = "SELECT filereq_data FROM file_validation WHERE id = ?";
    db.query(sql, [fileId], (err, result) => {
        if (err) {
            console.error("Error fetching file:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "File not found" });
        }

        const fileName = result[0].filereq_data;
        const filePath = path.join(__dirname, "uploads", fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found on server" });
        }

        res.download(filePath, fileName);
    });
});


// ------------------------- REPLY VERIFICATION COMMENT -------------------------
app.post('/replyvercomment', (req, res) => {
    const { member_name, ver_replies_text, verification_id, comment_id } = req.body;

    // ตรวจสอบว่ามี comment_id หรือไม่
    if (!comment_id) {
        return res.status(400).send('comment_id is required');
    }

    // สร้าง SQL Query สำหรับเพิ่มการตอบกลับ
    const sql = `
        INSERT INTO ver_comment_replies (ver_replies_text, member_name, verification_id, comment_id) 
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [ver_replies_text, member_name, verification_id, comment_id], (err, result) => {
        if (err) {
            console.error('Error adding reply:', err);
            return res.status(500).send('Error adding reply');
        }
        res.status(201).send('Reply added successfully');
    });
});

// ------------------------- Baseline -------------------------
// API สำหรับสร้าง Baseline
app.post('/createbaseline', (req, res) => {
    const { requirement_id, baseline_at } = req.body;

    if (!requirement_id || !requirement_id.length) {
        return res.status(400).send({ error: "Requirement ID is required" });
    }

    const formattedDate = new Date(baseline_at)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' '); // "YYYY-MM-DD HH:mm:ss"

    // SQL เพื่อหา baseline_round ล่าสุดในระบบทั้งหมด
    const findLatestBaselineRoundQuery = `
        SELECT MAX(baseline_round) AS latest_baseline_round
        FROM baseline
    `;

    db.query(findLatestBaselineRoundQuery, (err, result) => {
        if (err) {
            console.error("Database error during baseline round check:", err);
            return res.status(500).send({
                error: "Failed to fetch the latest baseline round",
                details: err.sqlMessage || err.message,
            });
        }

        // baseline_round ใหม่ = ล่าสุด + 1 (ถ้าไม่มี baseline เลย ให้เริ่มต้นที่ 1)
        const newBaselineRound = (result[0]?.latest_baseline_round || 0) + 1;

        // เตรียมข้อมูลสำหรับ insert
        const insertBaselineQuery = `
            INSERT INTO baseline (requirement_id, baseline_round, baseline_at)
            VALUES ?
        `;
        const baselineValues = requirement_id.map((id) => [
            id,
            newBaselineRound,
            formattedDate,
        ]);

        // Insert baselines
        db.query(insertBaselineQuery, [baselineValues], (insertErr, insertResult) => {
            if (insertErr) {
                console.error("Database error during baseline insert:", insertErr);
                return res.status(500).send({
                    error: "Failed to create baseline",
                    details: insertErr.sqlMessage || insertErr.message,
                });
            }

            // อัปเดต requirement_status สำหรับ requirement_id ที่เกี่ยวข้อง
            const updateRequirementQuery = `
                UPDATE requirement
                SET requirement_status = ?
                WHERE requirement_id IN (?)
            `;
            const requirementStatus = `BASELINE`;

            db.query(updateRequirementQuery, [requirementStatus, requirement_id], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("Database error during requirement update:", updateErr);
                    return res.status(500).send({
                        error: "Failed to update requirements",
                        details: updateErr.sqlMessage || updateErr.message,
                    });
                }

                // สร้างข้อมูล response
                const insertedBaselines = baselineValues.map(([requirementId, baseline_round]) => ({
                    baseline_id: insertResult.insertId++, // เริ่มจาก insertId แล้วเพิ่มทีละ 1
                    requirement_id: requirementId,
                    baseline_round: baseline_round,
                    baseline_at: formattedDate,
                }));

                console.log("Inserted Baselines:", insertedBaselines);

                res.status(201).send({
                    message: "Baseline created successfully",
                    updatedRequirements: updateResult.affectedRows,
                    insertedRows: insertResult.affectedRows,
                    baselines: insertedBaselines,
                });
            });
        });
    });
});

app.get("/baselines", (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
        return res.status(400).send({ error: "Project ID is required" });
    }

    const query = `
      SELECT 
        b.baseline_round, b.baseline_at, 
        JSON_ARRAYAGG(r.requirement_id) AS requirements 
      FROM baseline b
      JOIN requirement r ON b.requirement_id = r.requirement_id
      WHERE r.project_id = ?
      GROUP BY b.baseline_round, b.baseline_at
      ORDER BY b.baseline_round ASC;
    `;

    db.query(query, [project_id], (err, results) => {
        if (err) {
            console.error("Database error:", err.message);
            return res.status(500).send({
                error: "Failed to fetch baselines",
                details: err.message,
            });
        }

        const baselines = results.map((row) => ({
            baseline_round: row.baseline_round,
            baseline_at: row.baseline_at,
            requirements: JSON.parse(row.requirements),
        }));

        res.status(200).send(baselines);
    });
});


app.post('/updaterequirements', (req, res) => {
    const { requirement_id, requirement_status } = req.body;

    if (!requirement_id || !requirement_status) {
        return res.status(400).send({ error: "Requirement ID and status are required." });
    }

    const updateQuery = `
      UPDATE requirement
      SET requirement_status = ?
      WHERE requirement_id IN (?)
    `;

    db.query(updateQuery, [requirement_status, requirement_id], (err, result) => {
        if (err) {
            console.error("Database error during requirement status update:", err);
            return res.status(500).send({
                error: "Failed to update requirements.",
                details: err.sqlMessage || err.message,
            });
        }

        res.status(200).send({
            message: "Requirement statuses updated successfully.",
            updatedRows: result.affectedRows,
        });
    });
});

//------------------------------HISTORY REQUIREMENT----------------------------------
//บันทึกลงตาราง HISTORY REQUIREMENT
app.post('/historyReqWorking', (req, res) => {
    console.log('Request Body:', req.body);

    // ดึงข้อมูลที่จำเป็นทั้งหมดจาก request body
    const {
        requirement_id,
        requirement_name,
        requirement_description, 
        requirement_type,        
        requirement_status
    } = req.body;

    // ตรวจสอบว่าข้อมูลที่จำเป็นมีครบหรือไม่ (อาจเพิ่มการตรวจสอบให้ละเอียดขึ้น)
    if (requirement_id === undefined || requirement_name === undefined || requirement_description === undefined || requirement_type === undefined || requirement_status === undefined) {
        return res.status(400).json({ message: "Missing required fields in request body" });
    }

    // อัปเดต SQL query ให้รวมคอลัมน์ใหม่
    const sql = `
        INSERT INTO historyreq
        (requirement_id, requirement_name, requirement_description, requirement_type, requirement_status)
        VALUES (?, ?, ?, ?, ?)
    `;

    // อัปเดตอาร์เรย์ values ให้ตรงกับ placeholders ใน SQL
    const values = [
        requirement_id,
        requirement_name,         // เพิ่มเข้ามา
        requirement_description,  // เพิ่มเข้ามา
        requirement_type,         // เพิ่มเข้ามา
        requirement_status
    ];

    db.query(sql, values, (err, data) => {
        if (err) {
            console.error('Database Error:', err);
            // อาจส่งข้อความ error ที่ละเอียดขึ้นถ้าต้องการ แต่ระวังข้อมูล sensitive หลุดไป
            return res.status(500).json({ message: "Error adding entry to historyreq" });
        }
        // ส่งข้อมูลที่ insert สำเร็จกลับไปด้วย (data อาจมี insertId)
        return res.status(200).json({ message: "History added successfully", insertedData: data });
    });
});

//เเสดง HISTORY REQUIREMENT จาก REQ-ID นั้นที่กด VIEW
app.get('/getHistoryByRequirementId', (req, res) => {
    const requirementId = req.query.requirement_id;

    if (!requirementId) {
        return res.status(400).json({ message: "Missing requirement_id" });
    }

    const sql = `
        SELECT * FROM historyreq 
        WHERE requirement_id = ? 
        ORDER BY historyreq_at ASC;
    `;

    db.query(sql, [requirementId], (err, data) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: "Error fetching history" });
        }
        console.log('Fetched History:', data);  // ตรวจสอบว่าได้รับข้อมูลจากฐานข้อมูล
        return res.status(200).json({ message: "History fetched successfully", data });
    });
});

// ----------------------------- DESIGN ------------------------------
// Create Design
app.post("/design", (req, res) => {
    console.log("Request body:", req.body);

    // 1. รับข้อมูลจาก Request Body
    const {
        diagram_name,
        design_type,
        diagram_type,
        design_description,
        project_id,
        design_status,
        requirement_id, // requirement_id เป็น Array อยู่แล้วจาก Frontend
    } = req.body;

    // 2. ตรวจสอบ Fields พื้นฐาน และ requirement_id Array
    if (!diagram_name || !design_type || !diagram_type || !design_description || !project_id || !design_status ||
        !Array.isArray(requirement_id) || requirement_id.length === 0) { // เช็คว่าเป็น Array และไม่ว่าง
        console.error("Validation Error: Missing fields or requirement_id is not a non-empty array.", req.body);
        return res.status(400).json({ message: "Diagram name, types, description, project ID, status are required, and at least one requirement must be selected." });
    }

    // --- 3. แปลง Array ของ requirement_id เป็น JSON String ---
    let requirementIdJson;
    try {
        // ตรวจสอบให้แน่ใจว่าทุกตัวใน Array เป็นตัวเลข (หรือแปลงได้) ก่อน stringify (ถ้าจำเป็น)
        const validRequirementIds = requirement_id.map(id => {
            const parsedId = parseInt(id, 10);
            if (isNaN(parsedId)) {
                throw new Error(`Invalid requirement ID found: ${id}`);
            }
            return parsedId;
        });
        requirementIdJson = JSON.stringify(validRequirementIds); // แปลง Array เป็น JSON String
    } catch (parseError) {
        console.error("Validation Error: requirement_id array contains invalid values.", req.body);
        return res.status(400).json({ message: `Invalid data in requirement selection: ${parseError.message}` });
    }


    // 4. ใช้ Database Transaction
    db.beginTransaction(err => {
        if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).json({ message: "Database transaction error." });
        }

        // 5. Query: Insert ข้อมูลหลักลงในตาราง design (ใช้ JSON String)
        const designQuery = `
            INSERT INTO design (
                project_id, design_type, diagram_name, diagram_type,
                design_description, design_status, requirement_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const designParams = [
            project_id,
            design_type,
            diagram_name,
            diagram_type,
            design_description,
            design_status,
            requirementIdJson // <<< ใช้ JSON String ที่แปลงแล้ว
        ];

        db.query(designQuery, designParams, (err, results) => {
            if (err) {
                console.error("Error inserting design metadata:", err);
                return db.rollback(() => {
                    // การเช็ค Foreign Key Constraint สำหรับ JSON อาจไม่ทำงานตรงๆ
                    // คุณอาจต้อง Validate ID ใน requirement_id array ก่อนหน้าที่จะ Insert ถ้าต้องการ
                    // if (err.code === 'ER_NO_REFERENCED_ROW_2' && err.sqlMessage.includes("requirement_id")) {
                    //     // This check might not be reliable for JSON column. Consider validating IDs beforehand.
                    //     res.status(400).json({ message: `Failed to create design: One or more Requirement IDs do not exist.` });
                    // } else {
                    res.status(500).json({ message: "Failed to create design metadata." });
                    // }
                });
            }

            // 6. ดึง ID ของ Design ที่เพิ่งสร้างขึ้นมา
            const newDesignId = results.insertId;
            console.log(`Design metadata created successfully with ID: ${newDesignId} (Linked to requirement_ids: ${requirementIdJson}).`); // อัปเดต Log

            // 7. Commit Transaction
            db.commit(err => {
                if (err) {
                    console.error("Error committing transaction:", err);
                    return db.rollback(() => {
                        res.status(500).json({ message: "Database transaction commit error." });
                    });
                }

                console.log("Transaction committed successfully.");
                // 8. ส่ง Response สำเร็จกลับไป
                res.status(201).json({ message: "Design created successfully.", design_id: newDesignId });
            }); // End Commit
        }); // End Design Query Callback
    }); // End Begin Transaction Callback
}); // End app.post


app.get("/getDesignFiles", (req, res) => {
    const { design_id } = req.query;

    if (!design_id) {
        return res.status(400).json({ message: "Missing design_id." });
    }

    const selectFilesQuery = `SELECT * FROM file_design WHERE design_id = ?`;

    db.query(selectFilesQuery, [design_id], (err, results) => {
        if (err) {
            console.error("Error fetching files:", err);
            return res.status(500).json({ message: "Failed to fetch files." });
        }

        // ตรวจสอบว่าได้ไฟล์มาแล้วหรือไม่
        if (results.length === 0) {
            return res.status(404).json({ message: "No files found for this design." });
        }

        // ส่งไฟล์ที่ดึงมา
        res.status(200).json(results);
    });
});

// Get Designs by Project ID
app.get("/design", (req, res) => {
    const { project_id, status } = req.query;
    if (!project_id) return res.status(400).json({ error: "Project ID is required." });

    let query = `
        SELECT design_id, project_id, requirement_id, design_type, diagram_name, 
               diagram_type, design_description, design_status 
        FROM design 
        WHERE project_id = ?`;
    const params = [project_id];

    if (status) {
        query += " AND design_status = ?";
        params.push(status);
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Error fetching designs:", err);
            res.status(500).json({ error: "Failed to fetch designs" });
        } else {
            res.status(200).json(results);
        }
    });
});


app.get("/designedit", (req, res) => {
    const { project_id, design_id } = req.query;
    if (!project_id) return res.status(400).json({ error: "Project ID is required." });
  
    let query = `
        SELECT 
            d.design_id, 
            d.project_id, 
            d.requirement_id, 
            d.design_type, 
            d.diagram_name, 
            d.diagram_type, 
            d.design_description, 
            d.design_status, 
            fd.file_design_id, 
            fd.file_design_data, 
            fd.create_at AS file_created_at, 
            fd.update_at AS file_updated_at, 
            fdr.uploaded_at
        FROM design d
        LEFT JOIN file_design_relation fdr ON d.design_id = fdr.design_id
        LEFT JOIN file_design fd ON fdr.file_design_id = fd.file_design_id
        WHERE d.project_id = ?
    `;
  
    const params = [project_id];
  
    if (design_id) {
        query += " AND d.design_id = ?";
        params.push(design_id);
    }
  
    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Error fetching designs:", err);
            res.status(500).json({ error: "Failed to fetch designs" });
        } else {
            // ส่ง requirement_id เป็นค่าเดิมโดยไม่ต้องแปลง
            res.status(200).json(results);
        }
    });
  });

app.put("/design/:designId", (req, res) => { // Removed async
    const { designId } = req.params;
    const {
        project_id,
        diagram_name,
        design_type,
        diagram_type,
        design_description,
        requirement_id, // EXPECTING: Array or null/undefined
        design_status
    } = req.body;

    console.log(`📥 PUT /design/${designId} - Received body:`, req.body);

    // --- Validation (Keep all the validation logic as before) ---
    const designIdNum = parseInt(designId, 10);
    if (isNaN(designIdNum)) {
        return res.status(400).json({ message: "Invalid Design ID format." });
    }

    if (!diagram_name || !design_type || !diagram_type || !design_description || !design_status) {
        const missingFields = ['diagram_name', 'design_type', 'diagram_type', 'design_description', 'design_status']
                              .filter(field => !req.body[field]);
        return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}.` });
    }

    let requirementIdJson = null;
    if (requirement_id !== undefined && requirement_id !== null) {
        if (!Array.isArray(requirement_id)) {
            return res.status(400).json({ message: "Invalid requirement_id format. Expected an array or null." });
        }
        if (requirement_id.length > 0) {
            try {
                const validRequirementIds = requirement_id.map(id => {
                    const parsedId = parseInt(id, 10);
                    if (isNaN(parsedId)) {
                        throw new Error(`Invalid requirement ID found: ${id}`);
                    }
                    return parsedId;
                });
                requirementIdJson = JSON.stringify(validRequirementIds);
            } catch (parseError) {
                return res.status(400).json({ message: `Invalid data in requirement selection: ${parseError.message}` });
            }
        }
    }

    let projectIdNum = null;
    if (project_id !== undefined && project_id !== null) {
        if (isNaN(parseInt(project_id, 10))) {
             return res.status(400).json({ message: "Invalid project_id format. Must be an integer." });
        }
         projectIdNum = parseInt(project_id, 10);
    }
    // --- End Validation ---


    // --- SQL Query --- (No changes needed here)
    const updateDesignQuery = `
        UPDATE design
        SET
            ${projectIdNum !== null ? 'project_id = ?,' : ''}
            diagram_name = ?,
            design_type = ?,
            diagram_type = ?,
            design_description = ?,
            requirement_id = ?,
            design_status = ?
        WHERE design_id = ?
    `;

    // --- SQL Parameters --- (No changes needed here)
    const designParams = [];
    if (projectIdNum !== null) {
         designParams.push(projectIdNum);
    }
    designParams.push(
        diagram_name,
        design_type,
        diagram_type,
        design_description,
        requirementIdJson,
        design_status,
        designIdNum
    );

    console.log("Executing SQL:", updateDesignQuery);
    console.log("With Params:", designParams);

    // --- MODIFIED: Database Operation using Callbacks ---
    db.query(updateDesignQuery, designParams, (err, results) => {
        // Error Handling
        if (err) {
            console.error("❌ Error updating design metadata:", err);
             // Optional: Check for specific DB errors like foreign key violations if needed
            if (projectIdNum !== null && err.code === 'ER_NO_REFERENCED_ROW_2' && err.sqlMessage.includes("project_id")) {
                return res.status(400).json({ message: `Update failed: Project ID ${projectIdNum} does not exist.` });
            }
            // Generic server error
            return res.status(500).json({ message: "Failed to update design metadata due to a database error.", error: err.message });
        }

        // Success Handling
        if (results.affectedRows === 0) {
            // No rows updated, likely because the design_id wasn't found
            return res.status(404).json({ message: `Design with ID ${designIdNum} not found.` });
        }

        // If update was successful
        console.log(`✅ Design metadata for ID ${designIdNum} updated successfully.`);
        res.status(200).json({ message: "Design updated successfully." });
    });
    // --- End MODIFIED ---
});

// Update Design Status
app.put("/statusdesign", (req, res) => {
    const { id } = req.params;
    const { design_status } = req.body;
    const sql = "UPDATE design SET design_status = ? WHERE design_id = ?";

    db.query(sql, [design_status, id], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Error updating design status" });
        }
        return res.status(200).json({ message: "Design status updated successfully" });
    });
});

app.delete("/design/:designId", (req, res) => {
    const designId = req.params.designId;

    // เริ่ม transaction
    db.beginTransaction((err) => {
        if (err) {
            console.error("Error starting transaction:", err);
            return res.status(500).json({ error: "Failed to start transaction" });
        }

        // ลบข้อมูลในตาราง file_design_relation
        db.query("DELETE FROM file_design_relation WHERE design_id = ?", [designId], (err, result) => {
            if (err) {
                return db.rollback(() => {
                    console.error("Error deleting file_design_relation:", err);
                    return res.status(500).json({ error: "Failed to delete file_design_relation" });
                });
            }

            // ลบข้อมูลในตาราง file_design
            db.query("DELETE FROM file_design WHERE file_design_id IN (SELECT file_design_id FROM file_design_relation WHERE design_id = ?)", [designId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error("Error deleting file_design:", err);
                        return res.status(500).json({ error: "Failed to delete file_design" });
                    });
                }

                // ลบข้อมูลในตาราง veridesign
                db.query("DELETE FROM veridesign WHERE design_id = ?", [designId], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error("Error deleting veridesign:", err);
                            return res.status(500).json({ error: "Failed to delete veridesign" });
                        });
                    }

                    // ลบข้อมูลในตาราง baselinedesign
                    db.query("DELETE FROM baselinedesign WHERE design_id = ?", [designId], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Error deleting baselinedesign:", err);
                                return res.status(500).json({ error: "Failed to delete baselinedesign" });
                            });
                        }

                        // ลบข้อมูลในตาราง historydesign
                        db.query("DELETE FROM historydesign WHERE design_id = ?", [designId], (err, result) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error("Error deleting historydesign:", err);
                                    return res.status(500).json({ error: "Failed to delete historydesign" });
                                });
                            }

                            // ลบข้อมูลในตาราง design
                            db.query("DELETE FROM design WHERE design_id = ?", [designId], (err, result) => {
                                if (err) {
                                    return db.rollback(() => {
                                        console.error("Error deleting design:", err);
                                        return res.status(500).json({ error: "Failed to delete design" });
                                    });
                                }

                                // commit transaction
                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            console.error("Error committing transaction:", err);
                                            return res.status(500).json({ error: "Failed to commit transaction" });
                                        });
                                    }

                                    res.status(200).json({ message: "Design and related data deleted successfully" });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/getHistoryByDesignId', (req, res) => {
    // รับ design_id จาก query parameter
    const designId = req.query.design_id;

    // ตรวจสอบว่าได้รับ design_id หรือไม่
    if (!designId) {
        return res.status(400).json({ message: "Missing design_id parameter" });
    }
    const sql = `
        SELECT 
            h.history_id,
            h.design_id,
            d.diagram_name,
            h.design_status,
            h.design_at 
        FROM 
            historydesign h 
        INNER JOIN 
            design d ON h.design_id = d.design_id 
        WHERE 
            h.design_id = ?
        ORDER BY 
            h.design_at ASC;
    `;

    db.query(sql, [designId], (err, data) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: "Error fetching design history" });
        }

        if (data.length === 0) {
             console.log(`No history found for design_id: ${designId}`);
             return res.status(200).json({ message: "No history found for this design ID", data: [] });
        }

        console.log(`Workspaceed Design History (with name) for design_id: ${designId}`, data);
        return res.status(200).json({ message: "Design history fetched successfully", data });
    });
});
// ---------------------------------------- FILE DESIGN -------------------------------------
// Assuming 'db' is your database connection and 'upload' is your configured multer instance
app.post("/uploadDesignFiles", upload.array("files"), (req, res) => {
    console.log("Received files:", req.files ? `${req.files.length} files` : 'No files array'); // Log file count
    console.log("Received body:", req.body); // Log text fields

    // Check if files exist
    if (!req.files || req.files.length === 0) {
        console.log("No files were uploaded in the request.");
        return res.status(400).json({ message: "No files uploaded" }); // Use 'message' for consistency
    }

    // --- Validation ---
    const { project_id, design_id } = req.body;
    if (!project_id) {
        console.error("Validation Error: project_id is missing from request body.");
        return res.status(400).json({ message: "Missing required project_id" });
    }
    if (!design_id) {
        console.error("Validation Error: design_id is missing from request body.");
        return res.status(400).json({ message: "Missing required design_id" });
    }
    // Optional: Add type validation if needed (e.g., ensure they are numbers)
    const numericProjectId = parseInt(project_id, 10);
    const numericDesignId = parseInt(design_id, 10);
    if (isNaN(numericProjectId) || isNaN(numericDesignId)) {
         console.error("Validation Error: project_id or design_id is not a valid number.");
         return res.status(400).json({ message: "project_id and design_id must be numbers" });
    }


    // Consider using SQL's NOW() or CURRENT_TIMESTAMP directly in the query
    // const uploadedAt = Math.floor(Date.now() / 1000); // Only if your DB column needs Unix timestamp


    // --- Process File Inserts ---
    let fileInsertPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
            // Query WITHOUT file_design_name
            const sqlFile = `
                INSERT INTO file_design
                    (file_design_data, create_at, update_at, project_id)
                VALUES (?, NOW(), NOW(), ?)
            `; // Removed file_design_name
    
            console.log(`Executing SQL: ${sqlFile.trim().replace(/\s+/g, ' ')}`);
            // Params WITHOUT file.originalname
            console.log(`Params: [Buffer length: ${file.buffer.length}, ${numericProjectId}]`);
    
            // Execute query WITHOUT file.originalname
            db.query(sqlFile, [file.buffer, numericProjectId], (err, result) => {
                if (err) {
                    console.error("SQL Error inserting into file_design:", err);
                    reject({ message: "Database error inserting file metadata", details: err });
                } else {
                    console.log(`File inserted with ID: ${result.insertId}`);
                    resolve(result.insertId);
                }
            });
        });
    });

    // Wait for all files to be inserted into file_design
    Promise.all(fileInsertPromises)
        .then(fileDesignIds => {
            console.log("File metadata inserted IDs:", fileDesignIds);
            if (fileDesignIds.length === 0) {
                // Should not happen if req.files check passed, but good safety check
                return []; // Return empty array to avoid processing relations
            }

            // --- Process Relation Inserts ---
            let relationInsertPromises = fileDesignIds.map(fileDesignId => {
                return new Promise((resolve, reject) => {
                    // --- คำนวณ Unix timestamp (Integer) ---
                    const currentTimestamp = Math.floor(Date.now() / 1000);
            
                    // --- แก้ไข SQL Query ---
                    const sqlRelation = `
                        INSERT INTO file_design_relation
                            (file_design_id, design_id, uploaded_at)
                        VALUES (?, ?, ?)  -- <<< เปลี่ยน NOW() เป็น ?
                    `; // Using NOW() directly assuming 'uploaded_at' is TIMESTAMP/DATETIME
            
                    console.log(`Executing SQL (relation insert): Params: [${fileDesignId}, ${numericDesignId}, ${currentTimestamp}]`); // <<< เพิ่ม currentTimestamp ใน log
            
                    // --- แก้ไข Parameters ที่ส่งให้ Query ---
                    db.query(sqlRelation, [fileDesignId, numericDesignId, currentTimestamp], (err, result) => { // <<< เพิ่ม currentTimestamp เป็น parameter ที่ 3
                        if (err) {
                            console.error(`SQL Error inserting relation for file_id ${fileDesignId}, design_id ${numericDesignId}:`, err);
                            if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
                                 reject({ step: 'relation_insert', message: `Database error: Invalid reference key (file_id: ${fileDesignId} or design_id: ${numericDesignId}).`, details: err, status: 400 });
                            } else {
                                 reject({ step: 'relation_insert', message: "Database error creating file relation", details: err });
                            }
                        } else {
                            resolve({ file_design_id: fileDesignId, success: true });
                        }
                    });
                });
            });            

            // Wait for all relations to be inserted
            return Promise.all(relationInsertPromises);
        })
        .then(insertedRelations => {
            // insertedRelations is now an array of objects like [{ file_design_id: id, success: true }, ...]
            console.log("File relations inserted successfully:", insertedRelations);
            res.status(200).json({
                message: "Files uploaded and linked successfully!",
                // Send back info about the files that were processed
                processed_files: insertedRelations.map(rel => rel.file_design_id)
            });
        })
        .catch(error => {
            // Catch errors from either Promise.all chain
            console.error("Error during file upload process:", error);
            // Send detailed error if available, otherwise generic message
            res.status(500).json({
                message: error.message || "Failed to upload files due to a server error.",
                details: error.details || null // Include DB error details if available
            });
        });
});

app.get("/design/:designId/files", (req, res) => {
    const { designId } = req.params;

    const sql = `
        SELECT fdr.file_design_id, fd.file_design_data
        FROM file_design_relation fdr
        JOIN file_design fd ON fdr.file_design_id = fd.file_design_id
        WHERE fdr.design_id = ?
    `;

    db.query(sql, [designId], (err, results) => {
        if (err) {
            console.error("Error fetching files:", err);
            return res.status(500).json({ error: "Failed to fetch files" });
        }

        // แปลง Buffer เป็น Base64
        const files = results.map(file => ({
            file_design_id: file.file_design_id,
            file_design_data: `data:image/png;base64,${file.file_design_data.toString("base64")}` // เปลี่ยนเป็น "image/jpeg" หรือประเภทไฟล์ที่เหมาะสม
        }));

        res.status(200).json(files);
    });
});

// --- Endpoint to GET files for a specific design ---
app.get("/designFiles/design/:designId", (req, res) => {
    const designId = parseInt(req.params.designId, 10);

    if (isNaN(designId)) {
        return res.status(400).json({ message: "Invalid Design ID provided" });
    }

    console.log(`Workspaceing files for design_id: ${designId}`);

    const sql = `
        SELECT
            fd.file_design_id,
            fdr.uploaded_at
            -- fd.file_design_name, -- ถ้าคุณเพิ่มคอลัมน์นี้เข้าไป
            -- fd.create_at -- หรือข้อมูลอื่นๆ ที่ต้องการ
        FROM file_design_relation AS fdr
        JOIN file_design AS fd ON fdr.file_design_id = fd.file_design_id
        WHERE fdr.design_id = ?
        ORDER BY fdr.uploaded_at DESC; -- เรียงตามวันที่อัปโหลดล่าสุด (ตัวอย่าง)
    `;

    db.query(sql, [designId], (err, results) => {
        if (err) {
            console.error(`SQL Error fetching files for design_id ${designId}:`, err);
            return res.status(500).json({ message: "Database error fetching files", details: err });
        }

        console.log(`Found ${results.length} files for design_id ${designId}`);

        // ส่งผลลัพธ์กลับเป็น JSON Array
        res.status(200).json(results);
    });
});

app.delete("/design/file/:fileDesignId", (req, res) => {
    const { fileDesignId } = req.params;

    if (!fileDesignId) {
        return res.status(400).json({ error: "File ID is required" });
    }

    // ลบความสัมพันธ์ก่อน
    const deleteRelationQuery = `DELETE FROM file_design_relation WHERE file_design_id = ?`;

    db.query(deleteRelationQuery, [fileDesignId], (err, result) => {
        if (err) {
            console.error("Error deleting file relation:", err);
            return res.status(500).json({ error: "Failed to delete file relation" });
        }

        // ลบไฟล์ออกจาก file_design
        const deleteFileQuery = `DELETE FROM file_design WHERE file_design_id = ?`;

        db.query(deleteFileQuery, [fileDesignId], (err, result) => {
            if (err) {
                console.error("Error deleting file:", err);
                return res.status(500).json({ error: "Failed to delete file" });
            }

            res.status(200).json({ message: "File deleted successfully" });
        });
    });
});

//----------------------------------------- DESIGN HISTORY -----------------------------------------------------
// Add History Design
app.post("/addHistoryDesign", (req, res) => {
    // 1. ดึงข้อมูลทั้งหมดที่จำเป็นจาก request body
    const {
        design_id,
        requirement_id,      // เพิ่มเข้ามา (จาก table definition)
        design_type,         // เพิ่มเข้ามา
        diagram_name,        // เพิ่มเข้ามา
        diagram_type,        // เพิ่มเข้ามา
        design_description,  // เพิ่มเข้ามา
        design_status        // มีอยู่แล้ว
    } = req.body;

    // 2. ตรวจสอบว่าข้อมูลที่จำเป็น (ยกเว้น history_id, design_at) มีครบหรือไม่
    if (design_id === undefined || requirement_id === undefined || design_type === undefined || diagram_name === undefined || diagram_type === undefined || design_description === undefined || design_status === undefined) {
        // สร้างข้อความ error ที่ชัดเจนขึ้น (ถ้าต้องการ)
        const missingFields = Object.entries({ design_id, requirement_id, design_type, diagram_name, diagram_type, design_description, design_status })
                                   .filter(([key, value]) => value === undefined)
                                   .map(([key]) => key);
        return res.status(400).json({
            message: "ข้อมูลไม่ครบถ้วน กรุณาระบุฟิลด์: " + missingFields.join(', '),
            missingFields: missingFields
         });
    }

    // 3. อัปเดต SQL query ให้รวมคอลัมน์ใหม่
    const sql = `
        INSERT INTO historydesign (
            design_id,
            requirement_id,      -- เพิ่ม
            design_type,         -- เพิ่ม
            diagram_name,        -- เพิ่ม
            diagram_type,        -- เพิ่ม
            design_description,  -- เพิ่ม
            design_status,
            design_at            -- ใช้ NOW()
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) -- เพิ่ม placeholders ให้ตรงกัน
    `;

    // 4. สร้าง Array ของ values ให้ตรงกับ placeholders (ไม่รวม NOW())
    const values = [
        design_id,
        requirement_id,      // เพิ่ม
        design_type,         // เพิ่ม
        diagram_name,        // เพิ่ม
        diagram_type,        // เพิ่ม
        design_description,  // เพิ่ม
        design_status
    ];

    // 5. Execute query (เหมือนเดิม แต่ใช้ sql และ values ใหม่)
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("❌ Database Error inserting into historydesign:", err);
            // อาจจะส่ง error code ของ DB กลับไปถ้าจำเป็น แต่ระวังข้อมูล sensitive
            return res.status(500).json({ message: "เกิดข้อผิดพลาด: ไม่สามารถบันทึกประวัติการออกแบบได้", error: err.code });
        }

        console.log(`📜 Design History added: ID ${result.insertId}, Design ID: ${design_id}, Status: ${design_status}`);
        return res.status(201).json({ // เปลี่ยนเป็น 201 Created เพื่อความถูกต้องตาม RESTful
             message: "บันทึกประวัติการออกแบบสำเร็จ!",
             history_id: result.insertId, // ส่ง ID ของ record ที่เพิ่งสร้างกลับไป
             insertedData: req.body // อาจจะส่งข้อมูลที่รับมากลับไปด้วย
         });
    });
});

// Get History by Design ID
app.get('/getHistoryByDesignId', (req, res) => {
    const design_id = req.query.design_id;
    if (!design_id) return res.status(400).json({ message: "กรุณาระบุ 'design_id'" });

    const sql = `
        SELECT * FROM historydesign
        WHERE design_id = ?
        ORDER BY design_at ASC
    `;

    db.query(sql, [design_id], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: "ไม่สามารถดึงข้อมูลประวัติการออกแบบได้" });
        }

        return res.status(200).json({ message: "ดึงข้อมูลสำเร็จ!", data: results });
    });
});

app.get('/veridesign-history/:project_id', (req, res) => {
    const projectId = req.params.project_id;

    // --- Input Validation ---
    if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }

    // --- SQL Query ---
    // Make sure this selects the correct columns based on your actual table structure
    // If you have design_ids and design_status, add them here.
    // Using the original query based on your provided code:
    const query = `
        SELECT
            veridesign_id,
            project_id,
            veridesign_round,
            create_by,
            design_id,       -- Select design_id (as per your query)
            veridesign_at,
            veridesign_by    -- This should contain the JSON string like '{"user":true, ...}'
        FROM
            veridesign
        WHERE
            project_id = ?
        ORDER BY
            veridesign_at DESC;
    `;

    // --- Execute Query ---
    db.query(query, [projectId], (error, results) => { // Removed 'fields' as it's often unused

        // 1. Handle Database Query Error
        if (error) {
            console.error('Database query error in /veridesign-history:', error);
            return res.status(500).json({
                message: 'Database query failed while fetching design history.',
                error_code: error.code, // Include error code if available
                error_details: error.sqlMessage || error.message // Include details
            });
        }

        // 2. Process Results (if query succeeded)
        try {
            const processedResults = results.map(item => {
                // <<< --- START: CORRECTED PARSING LOGIC FOR OBJECT --- >>>
                let veriDesignByParsed = {}; // Default to an EMPTY OBJECT {}

                // Add logs to see the raw data coming from DB for this specific field
                console.log(`Processing log ${item.veridesign_id}. Raw veridesign_by from DB:`, item.veridesign_by);

                try {
                    // Check if there is data in the column
                    if (item.veridesign_by) {
                        // Attempt to parse the JSON string
                        veriDesignByParsed = JSON.parse(item.veridesign_by);

                        // **Important Check:** Verify if the parsed result is actually an object
                        // (and not null or an array, as JSON can represent those too)
                        if (typeof veriDesignByParsed !== 'object' || veriDesignByParsed === null || Array.isArray(veriDesignByParsed)) {
                            console.warn(`Parsed veridesign_by for log ${item.veridesign_id} is NOT a valid object:`, veriDesignByParsed);
                            veriDesignByParsed = {}; // Reset to empty object if not a valid object structure
                        } else {
                             console.log(`Successfully parsed veridesign_by for log ${item.veridesign_id} into object:`, veriDesignByParsed);
                        }
                    } else {
                        // If the DB column is NULL or empty string, keep it as an empty object
                         console.log(`veridesign_by for log ${item.veridesign_id} is null or empty in DB. Defaulting to {}.`);
                        veriDesignByParsed = {};
                    }
                } catch (e) {
                    // Handle JSON parsing errors specifically
                    console.error(`ERROR parsing veridesign_by JSON for log ${item.veridesign_id}:`, e.message);
                    console.error(`Raw data that caused error:`, item.veridesign_by); // Log the problematic data
                    veriDesignByParsed = {}; // Reset to empty object on parsing error
                }
                // <<< --- END: CORRECTED PARSING LOGIC FOR OBJECT --- >>>

                // Return the whole item, replacing veridesign_by with the parsed object (or {})
                // Ensure other necessary fields are returned correctly (like design_id)
                return {
                    veridesign_id: item.veridesign_id,
                    project_id: item.project_id,
                    veridesign_round: item.veridesign_round,
                    create_by: item.create_by,
                    design_id: item.design_id, // Make sure this matches the data needed by the modal
                    veridesign_at: item.veridesign_at,
                    veridesign_by: veriDesignByParsed // This is now guaranteed to be an object {}
                    // Add design_ids or design_status here if needed and selected in the query
                };
            }); // End of map

            // 3. Send the processed results
             console.log("Sending processed history data to frontend."); // Log before sending
            res.status(200).json(processedResults);

        } catch (processingError) {
            // 4. Handle unexpected errors during the .map() processing phase
            console.error('Error processing design history results after query:', processingError);
            res.status(500).json({
                 message: 'Server error processing design history results.',
                 error_details: processingError.message
            });
        }
    }); // End of db.query callback
}); // End of app.get
//----------------------------------------- DESIGN CRITERIA -----------------------------------------------------
// Fetch all criteria
app.get('/designcriteria/:projectId', (req, res) => {
    const { projectId } = req.params;  // ดึง projectId จาก URL params
    const sql = "SELECT * FROM designcriteria WHERE project_id = ?";

    db.query(sql, [projectId], (err, result) => {
        if (err) {
            console.error('Error fetching Design Criteria:', err);
            return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Design Criteria' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูล Design Criteria' });
        }

        res.status(200).json(result);  // ส่งข้อมูลไปยัง frontend
    });
});

// Add new criteria
app.post('/designcriteria', (req, res) => {
    const { design_cri_name, project_id } = req.body;

    if (!design_cri_name || design_cri_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }

    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = "INSERT INTO designcriteria (design_cri_name, project_id) VALUES (?, ?)";
    db.query(sql, [design_cri_name, project_id], (err, result) => {
        if (err) {
            console.error('Error creating criteria:', err);
            return res.status(500).json({ message: "Error creating criteria" });
        }
        res.status(201).json({ message: "Criteria created successfully", data: result });
    });
});

// Update criteria
app.put('/updatedesigncriteria', (req, res) => {
    const { design_cri_name } = req.body;
    const { id } = req.params;

    if (!design_cri_name || design_cri_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }

    const sql = "UPDATE designcriteria SET design_cri_name = ? WHERE design_cri_name = ?";
    db.query(sql, [design_cri_name, id], (err, result) => {
        if (err) {
            console.error('Error updating criteria:', err);
            return res.status(500).json({ message: "Error updating criteria" });
        }
        res.status(200).json({ message: "Criteria updated successfully", data: result });
    });
});

// Delete criteria
app.delete('/designcriteria/:id', (req, res) => {
    const { id } = req.params;

    const checkSql = "SELECT * FROM designcriteria WHERE design_cri_id = ?";
    const deleteSql = "DELETE FROM designcriteria WHERE design_cri_id = ?";

    db.query(checkSql, [id], (err, result) => {
        if (err) {
            console.error('Error checking criteria:', err);
            return res.status(500).json({ message: "Error checking criteria" });
        }

        console.log("Check Result:", result);  // เพิ่มบรรทัดนี้เพื่อดูข้อมูลที่ query ออกมา

        if (result.length === 0) {
            return res.status(404).json({ message: "Criteria not found" });
        }

        db.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting criteria:', err);
                return res.status(500).json({ message: "Error deleting criteria" });
            }
            res.status(200).json({ message: "Criteria deleted successfully" });
        });
    });
});

//----------------------------------------- VERIFICATION DESIGN -----------------------------------------------------
// Create Veridesign
app.post("/createveridesign", (req, res) => {
    const veridesignData = req.body;
    if (!Array.isArray(veridesignData) || veridesignData.length === 0) {
        return res.status(400).json({ message: "Invalid data format or empty array." });
    }

    // ดึงค่า veridesign_round ล่าสุดของ project_id นี้
    const projectId = veridesignData[0].project_id; // สมมติว่าใช้ project_id ตัวแรกเป็นตัวอ้างอิง
    const getLatestRoundQuery = `SELECT MAX(veridesign_round) AS latestRound FROM veridesign WHERE project_id = ?`;

    db.query(getLatestRoundQuery, [projectId], (err, results) => {
        if (err) {
            console.error("Error fetching latest veridesign_round:", err);
            return res.status(500).json({ message: "Failed to fetch latest veridesign_round." });
        }

        // ถ้ายังไม่มีข้อมูล ให้เริ่มต้นจาก 1
        const latestRound = results[0].latestRound || 0;
        let nextRound = latestRound + 1;

        const query =
            `INSERT INTO veridesign (project_id, veridesign_round, create_by, design_id, veridesign_at, veridesign_by) VALUES ?`;

        const formatDateTime = (date) => {
            const d = new Date(date);
            return d.toISOString().slice(0, 19).replace("T", " ");
        };

        const values = veridesignData.map((item) => [
            item.project_id,
            nextRound,
            item.create_by,
            item.design_id,
            formatDateTime(item.veridesign_at),
            JSON.stringify(item.veridesign_by),
        ]);

        db.query(query, [values], (err, result) => {
            if (err) {
                console.error("Error inserting data:", err);
                return res.status(500).json({ message: "Failed to create veridesign records." });
            }

            res.status(201).json({
                message: "Veridesign records created successfully.",
                affectedRows: result.affectedRows,
            });
        });
    });
});

// Get Designs by Project ID
app.get("/veridesign", (req, res) => {
    const { project_id } = req.query;

    // Check if project_id is provided
    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required." });
    }

    // Query to fetch designs with status 'WORKING' for a specific project_id
    const query = `
      SELECT 
          design_id, 
          project_id, 
          requirement_id, 
          design_type, 
          diagram_name, 
          diagram_type, 
          design_description, 
          design_status 
      FROM 
          design 
      WHERE 
          project_id = ? AND design_status = 'WORKING';
    `;

    // Execute the query with the provided project_id
    db.query(query, [project_id], (err, results) => {
        if (err) {
            // Log and handle errors during the query execution
            console.error("❌ Error fetching designs with status WORKING:", err);
            return res.status(500).json({ error: "Failed to fetch designs" });
        }

        // Check if results exist but are empty
        if (results.length === 0) {
            console.log(`🟡 No designs found with status 'WORKING' for project ID: ${project_id}`);
            // ส่ง Array ว่างกลับไป พร้อม status 200 OK ก็ได้ เพื่อให้ Frontend จัดการได้ง่าย
            // return res.status(404).json({ message: "No designs found for this project with status 'WORKING'" });
             return res.status(200).json([]); // ส่ง Array ว่างกลับไป
        }

        // --- START: Modification to parse requirement_id ---
        console.log(`✅ Fetched ${results.length} designs with status 'WORKING' for project ID: ${project_id}. Processing requirement_id...`);

        const processedResults = results.map(design => {
            let parsedRequirementId = []; // กำหนดค่าเริ่มต้นเป็น Array ว่าง

            // ตรวจสอบว่า requirement_id มีค่าและเป็น String หรือไม่
            if (design.requirement_id && typeof design.requirement_id === 'string') {
                try {
                    // พยายาม parse JSON String เป็น JavaScript Array
                    const parsed = JSON.parse(design.requirement_id);

                    // ตรวจสอบอีกครั้งว่าผลลัพธ์จากการ parse เป็น Array จริงๆ
                    if (Array.isArray(parsed)) {
                        parsedRequirementId = parsed;
                    } else {
                        // Parse สำเร็จ แต่ไม่ได้ Array (เช่น parse "null" ได้ null, parse "123" ได้ 123)
                        console.warn(`[WARN] Parsed requirement_id for design ${design.design_id} is not an array after JSON.parse. Original: "${design.requirement_id}", Parsed:`, parsed);
                        // กำหนดให้เป็น Array ว่าง หรือค่าอื่นตามที่ต้องการ
                    }
                } catch (parseError) {
                    // ถ้า String ที่ได้มาไม่ใช่ JSON Format ที่ถูกต้อง
                    console.error(`[ERROR] Failed to parse requirement_id JSON string for design ${design.design_id}. Original: "${design.requirement_id}"`, parseError);
                    // กำหนดให้เป็น Array ว่าง หรือค่าอื่นตามที่ต้องการ
                }
            } else if (Array.isArray(design.requirement_id)) {
                 // กรณีที่ Database Driver คืนค่าเป็น Array มาให้โดยตรง (อาจเกิดขึ้นได้กับ DB บางประเภท/Driver)
                 parsedRequirementId = design.requirement_id;
                 console.log(`[INFO] requirement_id for design ${design.design_id} is already an array.`);
            } else if (design.requirement_id !== null && design.requirement_id !== undefined) {
                // กรณีมีค่า แต่ไม่ใช่ String และไม่ใช่ Array (เช่น เป็นตัวเลขเดี่ยวๆ)
                console.warn(`[WARN] Unexpected data type for requirement_id for design ${design.design_id}. Type: ${typeof design.requirement_id}, Value:`, design.requirement_id);
                // อาจจะแปลงเป็น Array ที่มีสมาชิกตัวเดียว ถ้าเหมาะสม
                // if (typeof design.requirement_id === 'number') {
                //     parsedRequirementId = [design.requirement_id];
                // }
            }
            // ถ้าเป็น null หรือ undefined จะใช้ค่า default คือ [] ที่กำหนดไว้ตอนแรก

            // คืนค่าเป็น Object ใหม่ โดยใช้ Spread Operator (...) เพื่อคัดลอก property เดิม
            // แล้วแทนที่ requirement_id ด้วยค่าที่ผ่านการ parse แล้ว
            return {
                ...design,
                requirement_id: parsedRequirementId
            };
        });
        // --- END: Modification to parse requirement_id ---


        // ส่งผลลัพธ์ที่ผ่านการ process แล้วกลับไป
        console.log(`✅ Successfully processed requirement_id for ${processedResults.length} designs.`);
        res.status(200).json(processedResults);
    });
});

// ดึงข้อมูล req_design ที่มี WAITING FOR VERIFICATION
app.get("/verilistdesign", (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required." });
    }

    let query = `
SELECT 
    vd.veridesign_id,  
    vd.veridesign_round,
    vd.create_by,
    vd.veridesign_at,
    GROUP_CONCAT(d.design_id) AS design_ids,
    d.design_status,
    vd.veridesign_by
FROM 
    veridesign vd
LEFT JOIN 
    design d ON vd.design_id = d.design_id
WHERE 
    vd.project_id = ?
GROUP BY 
    vd.veridesign_id, vd.veridesign_round, vd.create_by, vd.veridesign_at, d.design_status, vd.veridesign_by  -- Include veridesign_id in GROUP BY
ORDER BY 
    vd.veridesign_round ASC
LIMIT 25;
    `;

    db.query(query, [project_id], (err, results) => {
        if (err) {
            console.error("❌ Error fetching designs:", err);
            res.status(500).json({ error: "Failed to fetch designs" });
        } else {
            const processedResults = results.map((design) => {
                let veridesignByObject = {};

                try {
                    veridesignByObject = JSON.parse(design.veridesign_by || "{}");

                    // ตรวจสอบว่าถ้าข้อมูลเป็นอาเรย์ ให้นำมาสร้างเป็น object พร้อมสถานะ
                    if (Array.isArray(veridesignByObject)) {
                        veridesignByObject = veridesignByObject.reduce((acc, reviewer) => {
                            acc[reviewer] = false; // ตั้งสถานะ default เป็น false
                            return acc;
                        }, {});
                    }
                } catch (error) {
                    console.error("Error parsing veridesign_by:", error);
                    veridesignByObject = {}; // หากเกิดข้อผิดพลาดให้เป็น object ว่าง
                }

                return {
                    ...design,
                    veridesign_by: veridesignByObject
                };
            });

            console.log("🎨 VeriDesign Response:", processedResults);
            res.status(200).json(processedResults);
        }
    });
});

app.put('/update-veridesign-by', (req, res) => {
    const { veridesign_id, veridesign_by } = req.body;

    if (!veridesign_id || !veridesign_by || typeof veridesign_by !== 'object') {
        return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง" });
    }

    // ตรวจสอบว่า veridesign_id มีอยู่ในฐานข้อมูลหรือไม่
    const checkSql = 'SELECT * FROM veridesign WHERE veridesign_id = ?';
    db.query(checkSql, [veridesign_id], (checkErr, checkResult) => {
        if (checkErr) {
            console.error("Error checking veridesign ID:", checkErr);
            return res.status(500).json({ message: "ข้อผิดพลาดในการตรวจสอบข้อมูล" });
        }

        if (checkResult.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูล veridesign นี้ในฐานข้อมูล" });
        }

        // ดึงข้อมูล veridesign_by ที่มีอยู่แล้ว
        let currentVeridesignBy = checkResult[0].veridesign_by ? JSON.parse(checkResult[0].veridesign_by) : {};

        // รวมข้อมูลใหม่กับข้อมูลเดิม โดยไม่ลบข้อมูลที่มีอยู่แล้ว
        const updatedVeridesignBy = { ...currentVeridesignBy, ...veridesign_by };

        // อัปเดต veridesign_by ในฐานข้อมูล
        const sql = `
          UPDATE veridesign
          SET veridesign_by = ?
          WHERE veridesign_id = ?
        `;

        db.query(sql, [JSON.stringify(updatedVeridesignBy), veridesign_id], (err, result) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json({ message: "ไม่สามารถอัปเดตข้อมูล veridesign_by ได้" });
            }

            res.status(200).json({ message: "อัปเดตข้อมูล veridesign_by สำเร็จ" });
        });
    });
});


app.get("/verifydesign", (req, res) => {
    const { design_id } = req.query; // รับ design_id (อาจจะเป็น string คั่นด้วย comma)

    // ตรวจสอบว่า design_id ถูกส่งมาหรือไม่
    if (!design_id) {
        return res.status(400).json({ error: "Design ID(s) are required." });
    }

    // แปลง string เป็น array ของ IDs (เผื่อมีหลาย ID ส่งมาคั่นด้วย comma)
    // และทำความสะอาดข้อมูล (trim, filter ค่าว่าง)
    const designIdsArray = design_id.split(",")
                                   .map(id => id.trim()) // เอาช่องว่างหน้า/หลังออก
                                   .filter(id => id);    // กรองค่าว่างออก

    // ตรวจสอบว่าหลังแปลงแล้วมี ID เหลือหรือไม่
    if (designIdsArray.length === 0) {
        return res.status(400).json({ error: "Valid Design ID(s) are required." });
    }

    // --- จุดที่แก้ไข: เปลี่ยน SELECT * เป็นการระบุชื่อคอลัมน์ทั้งหมด ---
    const query = `
        SELECT
            design_id,
            project_id,
            requirement_id,
            design_type,
            diagram_name,
            diagram_type,
            design_description,
            design_status
        FROM
            design
        WHERE
            design_id IN (?) -- ใช้ IN clause กับ Array ของ IDs
    `;
    // --- จบส่วนแก้ไข ---

    // Execute query ด้วย Array ของ design IDs
    // Parameter ที่สองของ db.query ต้องเป็น Array ที่มี Array ของ ID อยู่ข้างใน [[id1, id2,...]] สำหรับ IN clause
    db.query(query, [designIdsArray], (err, results) => {
        if (err) {
            // หากมีข้อผิดพลาดในการ query ฐานข้อมูล
            console.error("Error fetching design details for verification:", err);
            res.status(500).json({ error: "Failed to fetch design details" });
        } else {
            // หาก query สำเร็จ ส่งผลลัพธ์กลับไป
             console.log(`Workspaceed ${results.length} design details for IDs: ${designIdsArray.join(', ')}`);
            res.status(200).json(results); // ส่ง Array ของ design objects กลับไป
        }
    });
});


app.get('/designveri', (req, res) => {
    const { project_id, veridesign_id, design_id } = req.query;

    // --- Basic Input Validation ---
     if (!project_id) { // veridesign_id and design_id are optional based on usage
         return res.status(400).json({ message: "Project ID is required." });
     }

    let sql = `
      SELECT DISTINCT
        vd.veridesign_id AS id,
        vd.create_by,
        vd.veridesign_at,
        vd.veridesign_by,
        d.design_id,
        d.design_type,
        d.diagram_name,
        d.diagram_type,
        d.design_description,
        d.design_status,
        d.requirement_id -- <<< OPTIONAL but recommended: Added requirement_id
      FROM veridesign vd
      LEFT JOIN design d
        ON vd.design_id = d.design_id
      WHERE vd.project_id = ?
    `;

    const params = [project_id];

    // Add conditions dynamically
    if (veridesign_id) {
        sql += ` AND vd.veridesign_id = ?`;
        // Ensure veridesign_id is treated as a number if needed by DB
         params.push(parseInt(veridesign_id, 10) || 0); // Or handle potential NaN better
    }

    if (design_id) {
        const designIds = design_id.split(',')
                                 .map(item => parseInt(item.trim(), 10)) // Parse to numbers
                                 .filter(id => !isNaN(id)); // Filter out invalid numbers
        if (designIds.length > 0) {
            sql += ` AND d.design_id IN (${designIds.map(() => '?').join(',')})`;
            params.push(...designIds);
        } else {
             // Handle case where design_id string had no valid numbers?
             console.warn("Received design_id query param but found no valid numeric IDs:", design_id);
             // Maybe return empty result or specific error if needed?
             // return res.status(400).json({ message: "Invalid design IDs provided." });
         }
    }

    console.log("[DEBUG /designveri] SQL:", sql); // Log SQL
     console.log("[DEBUG /designveri] Params:", params); // Log Params


    db.query(sql, params, (err, results) => { // Changed 'result' to 'results' for consistency
        if (err) {
            console.error("Database Error fetching /designveri:", err);
            return res.status(500).json({ message: "Error fetching design verification data.", error: err.code }); // Send only error code potentially
        }

        if (results.length === 0) {
             console.log("No data found for /designveri query with params:", req.query);
             // Return 200 with empty array, more friendly for frontend find()
            return res.status(200).json([]);
           // return res.status(404).json({ message: "No design verification data found matching criteria." });
        }

        // --- Process results with robust parsing ---
        const grouped = {};
        results.forEach((row) => {
            const currentVeridesignId = row.id; // Use a different variable name

            if (!grouped[currentVeridesignId]) {
                // --- Parse veridesign_by with try-catch ---
                let parsedBy = {}; // Default to empty object
                if (row.veridesign_by && typeof row.veridesign_by === 'string') {
                    try {
                        parsedBy = JSON.parse(row.veridesign_by);
                        if (typeof parsedBy !== 'object' || parsedBy === null) {
                             console.warn(`Parsed veridesign_by for id ${currentVeridesignId} is not an object:`, parsedBy);
                             parsedBy = {}; // Fallback
                         }
                    } catch (e) {
                        console.error(`Failed to parse veridesign_by for id <span class="math-inline">\{currentVeridesignId\}\: "</span>{row.veridesign_by}"`, e);
                         parsedBy = {}; // Fallback
                    }
                } else if (typeof row.veridesign_by === 'object' && row.veridesign_by !== null) {
                     parsedBy = row.veridesign_by; // Already an object
                 }
                // -----------------------------------------

                grouped[currentVeridesignId] = {
                    id: currentVeridesignId,
                    create_by: row.create_by,
                    veridesign_at: row.veridesign_at,
                    veridesign_by: parsedBy, // Use parsed value
                    design_details: [], // Store associated design details here instead of top-level
                };
            }

            // --- Add Design Details (including parsed requirement_id) ---
            if (row.design_id) {
                 // --- Parse requirement_id (Optional but Recommended) ---
                 let parsedRequirementId = [];
                 if (row.requirement_id && typeof row.requirement_id === 'string') {
                     try {
                         const parsed = JSON.parse(row.requirement_id);
                         if (Array.isArray(parsed)) {
                             parsedRequirementId = parsed;
                         } else {
                             console.warn(`Parsed requirement_id for design <span class="math-inline">\{row\.design\_id\} is not an array\. Original\: "</span>{row.requirement_id}"`);
                         }
                     } catch (e) {
                         console.error(`Failed to parse requirement_id for design <span class="math-inline">\{row\.design\_id\}\. Original\: "</span>{row.requirement_id}"`, e);
                     }
                 } else if (Array.isArray(row.requirement_id)) {
                     parsedRequirementId = row.requirement_id;
                 }
                 // -----------------------------------------------------

                // Avoid duplicating design details if JOIN returns multiple rows for same design somehow
                 if (!grouped[currentVeridesignId].design_details.some(d => d.design_id === row.design_id)) {
                    grouped[currentVeridesignId].design_details.push({
                        design_id: row.design_id,
                        design_type: row.design_type,
                        diagram_name: row.diagram_name,
                        diagram_type: row.diagram_type,
                        design_description: row.design_description,
                        design_status: row.design_status,
                        requirement_id: parsedRequirementId // Include parsed requirement_id
                    });
                 }
            }
             // -------------------------------------------------------
        });

        const designVerifications = Object.values(grouped);
        console.log(`Successfully processed and returning ${designVerifications.length} verification object(s) for /designveri.`);
        return res.status(200).json(designVerifications);
    });
});


// Update status waitingforveri ของ design
app.put('/update-design-status-waitingfor-ver/:id', (req, res) => {
    const { id } = req.params;
    const { design_status } = req.body;

    if (!design_status) {
        return res.status(400).json({ message: "Missing design_status field." });
    }

    const query = `
      UPDATE design
      SET design_status = ?
      WHERE design_id = ?
    `;

    db.query(query, [design_status, id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Design not found." });
        }

        res.status(200).json({ message: "Design status updated successfully." });
    });
});

app.put('/update-design-status-verified', (req, res) => {
    const { design_ids, design_status } = req.body; // design_ids ควรเป็น Array
    if (!Array.isArray(design_ids) || design_ids.length === 0) {
        return res.status(400).json({ message: "design_ids is required and should be a non-empty array." });
    }

    // สร้าง placeholders สำหรับ Array
    const placeholders = design_ids.map(() => '?').join(',');
    const sql = `
      UPDATE design
      SET design_status = ?
      WHERE design_id IN (${placeholders})
    `;

    // พารามิเตอร์จะเป็น design_status ตามด้วย design_ids ทั้งหมด
    const params = [design_status, ...design_ids];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No design found with the provided design_ids." });
        }
        res.status(200).json({ message: "Design status updated to VERIFIED successfully." });
    });
});


// ------------------------- Comment VeriDesign --------------------------------

app.get('/get-commentveridesign', (req, res) => {
    const { veridesign_id } = req.query;

    // Check if veridesign_id is provided
    if (!veridesign_id) {
        return res.status(400).json({ error: "veridesign_id is required" });
    }

    console.log('Fetching comments for veridesign_id:', veridesign_id);

    // SQL query to fetch comments based on veridesign_id
    const sql = `
        SELECT 
            comverdesign_id,
            member_name,
            comverdesign_text,
            comverdesign_at
        FROM 
            comment_veridesign
        WHERE 
            veridesign_id = ?
        ORDER BY 
            comverdesign_at DESC
    `;

    db.query(sql, [veridesign_id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error fetching comments", details: err.message });
        }

        // Return comments in the response, even if empty
        res.status(200).json(results);
    });
});

// Add a comment to a specific veriDesign
app.post('/commentveridesign', (req, res) => {
    const { member_name, comverdesign_text, veridesign_id } = req.body;
    console.log('Received data:', req.body);

    // SQL query to insert a new comment
    const sql = 'INSERT INTO comment_veridesign (member_name, comverdesign_text, veridesign_id) VALUES (?, ?, ?)';

    db.query(sql, [member_name, comverdesign_text, veridesign_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error adding comment');
        }

        res.status(201).send('Comment added successfully');
    });
});

// Delete a specific comment by comverdesign_id
app.delete("/delete-commentveridesign/:comverdesign_id", (req, res) => {
    const { comverdesign_id } = req.params;

    // Check if comverdesign_id is provided
    if (!comverdesign_id) {
        return res.status(400).json({ error: "comverdesign_id is required" });
    }

    console.log(`Deleting comment with ID: ${comverdesign_id}`);

    // SQL query to delete the comment
    const sql = "DELETE FROM comment_veridesign WHERE comverdesign_id = ?";

    db.query(sql, [comverdesign_id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error deleting comment", details: err.message });
        }

        // Check if the comment was found and deleted
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Return success message
        res.status(200).json({ message: "Comment deleted successfully" });
    });
});

// ------------------------- Design Baseline -------------------------
// API สำหรับสร้าง Design Baseline
app.post('/createdesignbaseline', (req, res) => {
    const { design_id } = req.body;

    if (!Array.isArray(design_id) || design_id.length === 0) {
        return res.status(400).json({ message: "Design ID is required and should be a non-empty array" });
    }

    // ดึงค่า baselinedesign_round ล่าสุดของทุก design_id ที่มีอยู่ในระบบ
    const findLatestBaselineRoundQuery = `
        SELECT COALESCE(MAX(baselinedesign_round), 0) AS latest_baselinedesign_round FROM baselinedesign
    `;

    db.query(findLatestBaselineRoundQuery, (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Failed to fetch latest baseline round", details: err.message });
        }

        // ใช้ค่า baselinedesign_round ล่าสุด +1 (ใช้เลขเดียวกันทั้งหมด)
        const nextRound = (results[0].latest_baselinedesign_round || 0) + 1;
        console.log("Next baseline round:", nextRound);

        const formattedDate = new Date().toISOString().slice(0, 19).replace("T", " ");

        // ใช้ round เดียวกันทั้งหมด
        const baselineValues = design_id.map(id => [
            id,
            nextRound, // ใช้เลขเดียวกันหมด
            formattedDate
        ]);

        console.log("Baseline values to insert:", baselineValues); // Debugging

        const insertBaselineQuery = `
            INSERT INTO baselinedesign (design_id, baselinedesign_round, baselinedesign_at) VALUES ?
        `;

        db.query(insertBaselineQuery, [baselineValues], (insertErr, insertResult) => {
            if (insertErr) {
                console.error("Insert error:", insertErr);
                return res.status(500).json({ message: "Failed to insert baseline", details: insertErr.message });
            }

            // อัปเดตสถานะ design เป็น 'BASELINE'
            const updateDesignQuery = `UPDATE design SET design_status = 'BASELINE' WHERE design_id IN (?)`;

            db.query(updateDesignQuery, [design_id], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("Update error:", updateErr);
                    return res.status(500).json({ message: "Failed to update design status", details: updateErr.message });
                }

                res.status(201).json({
                    message: "Baseline created successfully",
                    insertedRows: insertResult.affectedRows,
                    updatedDesigns: updateResult.affectedRows,
                    baselinedesign: baselineValues
                });
            });
        });
    });
});



// ดึง Design ที่มีสถานะ VERIFIED สำหรับ Project ID
app.get("/designverified/:projectId", (req, res) => {
    const { projectId } = req.params;

    if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = `SELECT * FROM design WHERE project_id = ? AND design_status = 'VERIFIED'`;

    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error("Error fetching designs:", err);
            return res.status(500).json({ message: "Failed to fetch designs." });
        }
        res.json(results);
    });
});

// ดึงข้อมูล Design Baseline ตาม Project ID
app.get("/designbaseline", (req, res) => {
    const { project_id } = req.query;
    console.log("Received project_id:", project_id);

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required" });
    }
    const sql = `
        SELECT 
            b.baselinedesign_id, 
            b.design_id, 
            b.baselinedesign_round, 
            b.baselinedesign_at
        FROM baselinedesign b
        JOIN design d ON b.design_id = d.design_id
        WHERE d.project_id = ?
        GROUP BY b.baselinedesign_id
    `;

    db.query(sql, [project_id], (err, results) => {
        if (err) {
            console.error("Error fetching baselines:", err);
            return res.status(500).json({ error: "Failed to fetch baselines" });
        }

        console.log("Fetched baselines:", results);

        const formattedResults = results.map((row) => ({
            baselinedesign_id: row.baselinedesign_id,
            design_id: row.design_id,
            baselinedesign_round: row.baselinedesign_round,
            baselinedesign_at: row.baselinedesign_at
        }));

        res.json(formattedResults);
    });
});

// -------------------------- IMPLEMENT CONFIG ----------------------------------
app.post('/implementConfig', (req, res) => {
    const { githubLink, githubBranch, projectId } = req.body;

    if (!githubLink || !githubBranch || !projectId) {
        return res.status(400).json({ message: 'กรุณากรอก Github Link, Github Branch และ Project ID' });
    }

    const query = `INSERT INTO implementconfig (githubLink, githubBranch, project_id) VALUES (?, ?, ?)`;

    db.query(query, [githubLink, githubBranch, projectId], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).json({ message: 'ไม่สามารถบันทึกข้อมูลได้' });
        }

        res.status(201).json({ message: 'บันทึกข้อมูลสำเร็จ', id: result.insertId });
    });
});

app.get('/implementConfig/:projectId', (req, res) => {
    const { projectId } = req.params;
    const query = `SELECT * FROM implementconfig WHERE project_id = ?`;

    db.query(query, [projectId], (err, result) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลได้' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูล' });
        }

        res.status(200).json(result[0]);
    });
});

app.put('/implementConfig/:id', (req, res) => {
    const { id } = req.params;
    const { githubLink, githubBranch, projectId } = req.body;

    console.log("Received ID:", id);
    console.log("Received projectId:", projectId);

    const query = `UPDATE implementconfig 
                   SET githubLink = ?, githubBranch = ?, configAt = CURRENT_TIMESTAMP  
                   WHERE id = ? AND project_id = ?`;

    db.query(query, [githubLink, githubBranch, id, projectId], (err, result) => {
        if (err) {
            console.error('Error updating implement config:', err);
            return res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลได้' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการอัปเดต' });
        }

        res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ' });
    });
});

// ------------------------- FILE FILELOG ----------------------------------
app.post('/fetchfilelog', (req, res) => {
    console.log("Received data:", req.body);  // ดูค่าที่ได้รับ
    const { project_id } = req.body;

    if (!project_id) {
        return res.status(400).json({ error: "Missing project_id" });
    }

    // ดึงค่า fetch_round ล่าสุดจากฐานข้อมูล (ถ้ามี)
    const fetchRoundSql = "SELECT MAX(fetch_round) AS max_fetch_round FROM fetchfile_logs WHERE project_id = ?";
    db.query(fetchRoundSql, [project_id], (err, result) => {
        if (err) {
            console.error("DB Select Error:", err);
            return res.status(500).json({ error: "Database Query Failed" });
        }

        // กำหนดค่า fetch_round ให้เป็น fetch_round ล่าสุด + 1
        const fetch_round = result[0].max_fetch_round ? result[0].max_fetch_round + 1 : 1;

        // บันทึก log ลงในฐานข้อมูล
        const sql = "INSERT INTO fetchfile_logs (project_id, fetch_round) VALUES (?, ?)";
        db.query(sql, [project_id, fetch_round], (err, result) => {
            if (err) {
                console.error("DB Insert Error:", err);
                return res.status(500).json({ error: "Database Insert Failed" });
            }
            res.json({ message: "Log inserted successfully", fetchRound: fetch_round });
        });
    });
});

//--------------------------IMPLEMENT----------------------------------
app.get("/implementmapdesign", (req, res) => {
    // Extract project_id from the query parameter
    const { project_id } = req.query;

    // Check if project_id is provided, otherwise return a 400 error
    if (!project_id) {
        return res.status(400).json({ error: "Missing project_id" });
    }

    // Define the SQL query to fetch implementation details, including relation_at
    const sql = "SELECT implement_id, implement_filename, design_id, relation_at FROM implementation WHERE project_id = ?";

    // Execute the query with the project_id parameter
    db.query(sql, [project_id], (err, results) => {
        // Handle any errors from the query
        if (err) {
            console.error("Error fetching data:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        // Log the results to the console (for debugging)
        console.log("Fetched data:", results);

        // Process the results to convert design_id (JSON array) into a string
        const processedResults = results.map((row) => {
            // Convert design_id (JSON array) to a string of comma-separated values
            const designIdsString = JSON.parse(row.design_id);

            // Return the processed row with design_id as a string
            return {
                ...row,
                design_id: designIdsString, // Set design_id as a comma-separated string
            };
        });

        // Return the processed data as JSON response
        res.json({ data: processedResults });
    });
});


app.get('/implementrelation', (req, res) => {
    const { implementFilename } = req.query;
    let query = `
        SELECT implement_id, implement_filename, design_id, relation_at 
        FROM implementation 
        WHERE implement_filename IS NOT NULL AND design_id IS NOT NULL
    `;

    if (implementFilename) {
        query += ' AND implement_filename LIKE ?';
    }

    db.query(query, implementFilename ? [`%${implementFilename}%`] : [], (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // กรองเฉพาะแถวที่มีค่า implement_filename และ design_id
        const filteredResults = results.filter(item => item.implement_filename && item.design_id);

        // แปลงข้อมูลก่อนส่งกลับ
        const formattedResults = filteredResults.map(item => ({
            implement_filename: `${item.implement_filename}`,
            implement_id: item.implement_id,
            design_id: item.design_id,
            relation_at: item.relation_at,
            implement_status: item.implement_status || "UNKNOWN" // ป้องกัน undefined
        }));

        res.status(200).json({
            message: 'Data fetched successfully',
            data: formattedResults
        });
    });
});

// Endpoint to handle the insertion of implementation relations
app.post('/implementrelation', async (req, res) => {
    const data = req.body.data; // Extract data from the request body

    // Validate if data is an array and not empty
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).send("Invalid data format.");
    }

    try {
        // Group the data by implement_filename and project_id, combining all design_ids for each file
        const groupedData = {};

        data.forEach(item => {
            const key = `${item.implement_filename}-${item.project_id}`;
            if (!groupedData[key]) {
                groupedData[key] = {
                    implement_filename: item.implement_filename,
                    project_id: item.project_id,
                    design_ids: [] // ใช้เป็น array สำหรับเก็บหลายๆ design_id
                };
            }
            groupedData[key].design_ids.push(item.design_id);
        });

        // Prepare the grouped data for insertion
        const values = Object.values(groupedData).map(item => [
            item.implement_filename,
            JSON.stringify(item.design_ids), // ใช้ JSON.stringify สำหรับแปลง array เป็น JSON string
            item.project_id
        ]);

        // SQL query to insert data into the implementation table
        const sql = `
            INSERT INTO implementation (implement_filename, design_id, project_id) 
            VALUES ? 
            ON DUPLICATE KEY UPDATE design_id = VALUES(design_id)
        `;

        // Execute the query to insert data into the database
        await db.query(sql, [values]);

        res.status(201).send("Data inserted successfully.");
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).send("Error inserting data.");
    }
});

// ใช้ async/await และควรใช้ transaction ถ้าฐานข้อมูลรองรับ (เช่น mysql2)
// สมมติว่า db object มาจาก library ที่รองรับ promise และ transaction เช่น mysql2/promise

app.delete('/implementrelation', async (req, res) => {
    // 1. ดึงค่าจาก query parameters ให้ครบถ้วน
    const { implement_filename, relation_at, project_id } = req.query;

    // 2. ตรวจสอบ Input ที่จำเป็นทั้งหมด
    if (!implement_filename || !relation_at || !project_id) {
        return res.status(400).json({ message: 'Missing required query parameters: implement_filename, relation_at, project_id' });
    }

    // (Optional) ตรวจสอบ format ของ project_id และ relation_at
    const projectIdInt = parseInt(project_id, 10);
    if (isNaN(projectIdInt)) {
        return res.status(400).json({ message: 'Invalid project_id format. Must be an integer.' });
    }
    // อาจจะต้อง validate format ของ relation_at เพิ่มเติม ถ้าจำเป็น
    // const relationDate = new Date(relation_at);
    // if (isNaN(relationDate.getTime())) {
    //     return res.status(400).json({ message: 'Invalid relation_at format.' });
    // }

    // Log เพื่อ Debug
    console.log(`Received request to delete relation: file='${implement_filename}', time='${relation_at}', project=${projectIdInt}`);

    let connection; // ประกาศ connection นอก try block เพื่อใช้ใน finally
    try {
        // 3. เริ่ม Transaction (ถ้า db library รองรับ)
        // connection = await db.getConnection(); // ตัวอย่างการ get connection จาก pool
        // await connection.beginTransaction();

        // 4. ค้นหา implement_id ที่ตรงกับเงื่อนไขที่ระบุ
        const findImplementIdsQuery = `
            SELECT implement_id FROM implementation
            WHERE implement_filename = ?
              AND relation_at = ?
              AND project_id = ?;
        `;
        // const [implementRows] = await connection.query(findImplementIdsQuery, [implement_filename, relation_at, projectIdInt]);
        const [implementRows] = await db.query(findImplementIdsQuery, [implement_filename, relation_at, projectIdInt]); // หรือใช้ db.query ถ้าไม่ได้ใช้ transaction แยก connection

        if (implementRows.length === 0) {
            // ไม่พบ relation ที่ตรงกัน อาจไม่จำเป็นต้อง rollback แต่คืน 404
            // await connection.rollback(); // ไม่จำเป็นถ้ายังไม่ได้ทำอะไร
            // connection.release(); // คืน connection ถ้า get มา
            console.log(`No matching implementation found to delete.`);
            return res.status(404).json({ message: 'No matching implementation relation found to delete.' });
        }

        const implementIdsToDelete = implementRows.map(row => row.implement_id);
        console.log(`Found implement_ids to process: ${implementIdsToDelete.join(', ')}`);

        // 5. ลบข้อมูลในตารางลูก (baselinetrace) ที่อ้างอิงถึง implement_id เหล่านี้
        // ใช้ IN clause เพื่อลบทีเดียวหลาย id (ถ้ามี)
        if (implementIdsToDelete.length > 0) {
            const deleteBaselineTraceQuery = `
                DELETE FROM baselinetrace
                WHERE implement_id IN (?);
            `;
            // const [baselineResult] = await connection.query(deleteBaselineTraceQuery, [implementIdsToDelete]);
            const [baselineResult] = await db.query(deleteBaselineTraceQuery, [implementIdsToDelete]); // หรือใช้ db.query
            console.log(`Deleted ${baselineResult.affectedRows} rows from baselinetrace.`);
        }

        // 6. ลบข้อมูลในตารางแม่ (implementation) โดยใช้เงื่อนไขทั้งหมด
        const deleteImplementationQuery = `
            DELETE FROM implementation
            WHERE implement_filename = ?
              AND relation_at = ?
              AND project_id = ?;
        `;
        // const [implementationResult] = await connection.query(deleteImplementationQuery, [implement_filename, relation_at, projectIdInt]);
        const [implementationResult] = await db.query(deleteImplementationQuery, [implement_filename, relation_at, projectIdInt]); // หรือใช้ db.query
        console.log(`Deleted ${implementationResult.affectedRows} rows from implementation.`);

        // 7. Commit Transaction (ถ้าใช้)
        // await connection.commit();
        console.log(`Successfully deleted relation and associated traces.`);
        res.status(200).json({ message: `Successfully deleted ${implementationResult.affectedRows} relation(s) and associated data.` });

    } catch (error) {
        // 8. จัดการ Error และ Rollback Transaction (ถ้าใช้)
        console.error('Error deleting implementation relation:', error);
        // if (connection) {
        //     await connection.rollback(); // Rollback ถ้าเกิดข้อผิดพลาด
        // }
        // ส่ง status 500 Internal Server Error
        res.status(500).json({ message: 'Database error occurred during deletion.', error: error.message }); // ส่ง error message ไปด้วยเพื่อ debug
    } finally {
        // 9. คืน Connection (ถ้าใช้ pool และ get connection มา)
        // if (connection) {
        //     connection.release();
        // }
    }
});
// ------------------------- TEST CASE -------------------------------
app.post("/testcases", (req, res) => {
    const { testcase_name, testcase_des, testcase_type, testcase_priority,
        testcase_by, testcase_at, project_id, implement_id } = req.body;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required" });
    }

    let implementData;
    try {
        implementData = JSON.parse(implement_id); // ✅ แปลง JSON String เป็น Array
    } catch (error) {
        return res.status(400).json({ error: "Invalid JSON format for implement_id" });
    }

    const sqlTestCase = `INSERT INTO testcase (testcase_name, testcase_des, testcase_type, testcase_priority, 
                                               testcase_by, testcase_at, testcase_status, project_id, implement_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sqlTestCase, [testcase_name, testcase_des, testcase_type, testcase_priority,
        testcase_by, testcase_at, "WORKING", project_id, JSON.stringify(implementData)], // ✅ เก็บเป็น JSON
        (err, result) => {
            if (err) {
                console.error("❌ Error inserting test case:", err);
                return res.status(500).json({ error: "Failed to insert test case" });
            }

            const testcase_id = result.insertId;

            // ✅ เพิ่มข้อมูลลง test_execution
            const sqlExecution = `INSERT INTO test_execution (project_id, testcase_id, test_execution_status) VALUES (?, ?, ?)`;
            db.query(sqlExecution, [project_id, testcase_id, "NOT BASELINE"], (err, execResult) => {
                if (err) {
                    console.error("❌ Error inserting test execution:", err);
                    return res.status(500).json({ error: "Failed to insert test execution" });
                }

                res.status(201).json({
                    message: "Test Case and Execution created successfully",
                    testcase_id: testcase_id,
                    test_execution_id: execResult.insertId
                });
            });
        });
});


app.get("/testcases", (req, res) => {
    const { project_id } = req.query;

    let sql = `
        SELECT 
            t.testcase_id, 
            t.testcase_name, 
            t.testcase_type, 
            t.testcase_des, 
            t.testcase_priority, 
            t.testcase_by,
            t.testcase_at,
            t.testcase_status,
            t.implement_id,
            te.test_execution_status
        FROM testcase t
        LEFT JOIN test_execution te ON t.testcase_id = te.testcase_id
    `;

    const params = [];
    if (project_id) {
        sql += " WHERE t.project_id = ?";
        params.push(project_id);
    }

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("❌ Error fetching test cases:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});

// ✅ API ดึงข้อมูล Test Case ตาม testcase_id
app.get("/testcaseedit/:id", (req, res) => {
    const { id } = req.params;
    const query = "SELECT * FROM testcase WHERE testcase_id = ?";

    db.query(query, [id], (err, result) => {
        if (err) {
            console.error("❌ Error fetching test case:", err);
            return res.status(500).json({ error: "Database error" });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: "Test case not found" });
        }
        res.json(result[0]);
    });
});

// ✅ API อัปเดต Test Case ตาม testcase_id
app.put("/testcaseedit/:id", (req, res) => {
    const { id } = req.params;
    const {
        testcase_name,
        testcase_des,
        testcase_type,
        testcase_priority,
        testcase_by,
        testcase_at,
        testcase_status,
        project_id,
        implement_id,
    } = req.body;

    const query = `
      UPDATE testcase SET 
        testcase_name = ?,
        testcase_des = ?,
        testcase_type = ?,
        testcase_priority = ?,
        testcase_by = ?,
        testcase_at = ?,
        testcase_status = ?,
        project_id = ?,
        implement_id = ?
      WHERE testcase_id = ?`;

    const values = [
        testcase_name,
        testcase_des,
        testcase_type,
        testcase_priority,
        testcase_by,
        testcase_at,
        testcase_status,
        project_id,
        implement_id,
        id,
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error("❌ Error updating test case:", err);
            return res.status(500).json({ error: "Database error" });
        }
        res.json({ message: "✅ Test Case updated successfully!" });
    });
});

// API สำหรับลบ Test Case ตาม testcase_id
app.delete("/testcases/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Delete related entries from testcase_verification_result first
        await db.query("DELETE FROM testcase_verification_result WHERE testcase_id = ?", [id]);

        // Delete related entries from baselinetestcase
        await db.query("DELETE FROM baselinetestcase WHERE testcase_id = ?", [id]);

        // Delete related entries from test_procedures
        await db.query("DELETE FROM test_procedures WHERE testcase_id = ?", [id]);

        // Finally, delete from testcase
        await db.query("DELETE FROM testcase WHERE testcase_id = ?", [id]);

        res.json({ message: "Test case deleted successfully!" });
    } catch (error) {
        console.error("Error deleting testcase:", error);
        res.status(500).json({ error: "Failed to delete testcase" });
    }
});

//---------------------------- TEST EXECUTION ------------------------------
app.get("/api/testcase_executions", (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required" });
    }

    const query = `
        SELECT 
            t.testcase_id, 
            p.project_id, 
            t.testcase_name,
            t.testcase_status, -- เพิ่มตรงนี้
            te.test_execution_status,
            t.testcase_at
        FROM testcase t
        LEFT JOIN test_execution te ON t.testcase_id = te.testcase_id
        LEFT JOIN project p ON te.project_id = p.project_id
        WHERE p.project_id = ?;
    `;

    db.query(query, [project_id], (err, results) => {
        if (err) {
            console.error("❌ Database Query Error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "No test executions found for this project" });
        }

        console.log(`✅ Fetched test executions for project_id: ${project_id}`, results);
        res.json(results);
    });
});

// API สำหรับดึงข้อมูล Test Execution
app.get("/api/test_procedures/:testcase_id", (req, res) => {
    const { testcase_id } = req.params;

    if (!testcase_id) {
        return res.status(400).json({ error: "Test Case ID is required" });
    }
    const query = `
      SELECT 
          tp.test_procedures_id,
          tp.testcase_id,
          tc.testcase_name,
          tc.testcase_at,  
          tp.required_action,
          tp.expected_result,
          tp.prerequisite,
          tp.test_status,
          tp.actual_result,
          COALESCE(te.test_execution_status, 'Not Started') AS test_execution_status
      FROM test_procedures tp
      LEFT JOIN test_execution te ON tp.testcase_id = te.testcase_id
      INNER JOIN testcase tc ON tp.testcase_id = tc.testcase_id
      WHERE tp.testcase_id = ?
      LIMIT 25;
    `;

    db.query(query, [testcase_id], (err, results) => {
        if (err) {
            console.error("Error fetching test procedures:", err);
            return res.status(500).json({ error: "Database error" });
        }
        console.log("Test procedures:", results); // Debugging
        res.json(results);
    });

});


app.post("/api/update_test_execution", async (req, res) => {
    const { testSteps, testcase_id } = req.body;

    // --- Basic Input Validation --- (เหมือนเดิม)
    if (!testSteps || !Array.isArray(testSteps)) {
        return res.status(400).json({ error: "Invalid or missing 'testSteps' array" });
    }
    if (testSteps.length === 0) {
        console.log("Received empty testSteps array. No status update applied.");
        return res.json({ message: "No test steps provided. Execution status unchanged." });
    }
    if (!testcase_id) {
        return res.status(400).json({ error: "Missing 'testcase_id'" });
    }
    if (isNaN(parseInt(testcase_id))) {
        return res.status(400).json({ error: "Invalid 'testcase_id'" });
    }

    // --- Define Status Values (Strings) ---
    const STATUS_PASSED_STRING = "PASSED";
    const STATUS_IN_PROGRESS_STRING = "IN PROGRESS"; // <-- เพิ่มสถานะนี้
    // Optional: const STATUS_FAILED_STRING = "Failed";

    // --- SQL Queries --- (เหมือนเดิม)
    const updateStepQuery = `
        UPDATE test_procedures
        SET test_status = ?, actual_result = ?
        WHERE test_procedures_id = ?
    `;

    const updateExecutionStatusQuery = `
        UPDATE test_execution
        SET test_execution_status = ?
        WHERE testcase_id = ?
    `;

    // --- Database Operations ---
    try {
        // 1. Update individual test step statuses and actual results (เหมือนเดิม)
        await Promise.all(
            testSteps.map((step) => {
                // Basic validation for each step's data
                if (step.test_procedures_id == null || step.test_status == null || step.actual_result == null) {
                    console.error("Invalid data received for a step:", step);
                    throw new Error(`Invalid data for step ID ${step.test_procedures_id || 'UNKNOWN'}. Status or actual result might be missing.`);
                }
                return new Promise((resolve, reject) => {
                    db.query(updateStepQuery,
                        [step.test_status, step.actual_result, step.test_procedures_id],
                        (err, result) => {
                            if (err) {
                                console.error(`Error updating test step ${step.test_procedures_id}:`, err);
                                reject(new Error(`Database error updating step ${step.test_procedures_id}`));
                            } else {
                                if (result.affectedRows === 0) {
                                    console.warn(`No rows updated for test_procedures_id: ${step.test_procedures_id}. It might not exist.`);
                                }
                                resolve();
                            }
                        });
                });
            })
        );

        console.log(`Successfully updated individual steps for testcase_id: ${testcase_id}`);

        // 2. Check if ALL steps *just saved* have the status "Passed" (เหมือนเดิม)
        const allStepsPassed = testSteps.every(step => step.test_status === "Passed");

        // --- *** ส่วนแก้ไข: กำหนดสถานะสุดท้ายที่จะอัปเดต *** ---
        let finalExecutionStatus;
        if (allStepsPassed) {
            // ถ้าทุก step เป็น Passed, สถานะรวมคือ Passed
            finalExecutionStatus = STATUS_PASSED_STRING;
        } else {
            // ถ้ามี step ใดๆ ไม่ใช่ Passed, สถานะรวมให้กลับเป็น In Progress
            finalExecutionStatus = STATUS_IN_PROGRESS_STRING;
            // --- หมายเหตุ: ถ้าต้องการให้เป็น Failed ถ้ามีอันใดอันหนึ่ง Failed ---
            // const hasFailed = testSteps.some(step => step.test_status === "Failed");
            // finalExecutionStatus = hasFailed ? STATUS_FAILED_STRING : STATUS_IN_PROGRESS_STRING;
            // --- จบส่วนหมายเหตุ ---
        }
        // --- *** จบส่วนแก้ไข *** ---

        // 3. Update the test_execution table status based on the evaluation above
        //    (อัปเดตทุกครั้งที่ Save ไม่ว่าสถานะเดิมจะเป็นอะไรก็ตาม)
        console.log(`Updating execution status for testcase_id: ${testcase_id} to '${finalExecutionStatus}'.`);
        await new Promise((resolve, reject) => {
            db.query(updateExecutionStatusQuery,
                [finalExecutionStatus, testcase_id], // <-- ใช้สถานะสุดท้ายที่คำนวณได้
                (err, result) => {
                    if (err) {
                        console.error(`Error updating test execution status for testcase_id ${testcase_id}:`, err);
                        reject(new Error("Database error updating execution status."));
                    } else {
                        if (result.affectedRows === 0) {
                            // ควรจะมี record นี้อยู่แล้ว ถ้าไม่มีอาจจะแปลก
                            console.warn(`No test_execution record found or updated for testcase_id: ${testcase_id}.`);
                        } else {
                            console.log(`Successfully updated test_execution status for testcase_id: ${testcase_id} to '${finalExecutionStatus}'`);
                        }
                        resolve();
                    }
                });
        });

        res.json({ message: "Test execution updated successfully!" });

    } catch (error) {
        console.error("Error during test execution update process:", error);
        res.status(500).json({ error: "Database update error", details: error.message });
    }
});


//------------------------- file testcase ------------------------------

app.post("/api/upload_test_file", upload.single("file"), (req, res) => {
    console.log("Received file:", req.file);
    console.log("Received body:", req.body);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const { test_procedures_id, testcase_id } = req.body;
    const fileBuffer = req.file.buffer; // ✅ ใช้ buffer แทน path
    const fileName = req.file.originalname;

    const uploadedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    const sqlFile = `INSERT INTO file_testcase (file_testcase_name, file_testcase_data, uploaded_at, test_procedures_id) VALUES (?, ?, ?, ?)`;

    db.query(sqlFile, [fileName, fileBuffer, uploadedAt, test_procedures_id], (err, result) => {
        if (err) {
            console.error("Error inserting file:", err);
            return res.status(500).json({ error: "Failed to upload file" });
        }

        const fileTestcaseId = result.insertId;
        const sqlRelation = `INSERT INTO file_testcsase_relation (file_testcase_id, testcase_id, create_at) VALUES (?, ?, NOW())`;

        db.query(sqlRelation, [fileTestcaseId, testcase_id], (err) => {
            if (err) {
                console.error("Error inserting file relation:", err);
                return res.status(500).json({ error: "Failed to link file to testcase" });
            }

            res.status(200).json({ message: "File uploaded successfully!", file_testcase_name: fileName });
        });
    });
});

app.get("/api/get_test_files/:test_procedures_id", (req, res) => {
    const { test_procedures_id } = req.params;
    const sql = `SELECT file_testcase_name, file_testcase_data FROM file_testcase WHERE test_procedures_id = ?`;

    db.query(sql, [test_procedures_id], (err, results) => {
        if (err) {
            console.error("Error fetching files:", err);
            return res.status(500).json({ error: "Failed to retrieve files" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "No files found" });
        }

        const files = results.map(file => {
            if (!file.file_testcase_data) {
                return null; // ถ้าไม่มีข้อมูลไฟล์ให้ข้ามไป
            }

            // ตรวจสอบประเภทไฟล์จากชื่อไฟล์
            let mimeType = "application/octet-stream"; // ค่า default ถ้าไม่รู้ประเภทไฟล์
            if (file.file_testcase_name.endsWith(".jpg") || file.file_testcase_name.endsWith(".jpeg")) {
                mimeType = "image/jpeg";
            } else if (file.file_testcase_name.endsWith(".png")) {
                mimeType = "image/png";
            } else if (file.file_testcase_name.endsWith(".pdf")) {
                mimeType = "application/pdf";
            }

            return {
                file_testcase_name: file.file_testcase_name,
                file_url: `data:${mimeType};base64,${file.file_testcase_data.toString("base64")}`
            };
        }).filter(file => file !== null); // ลบค่า null ออกจาก array

        res.json(files);
    });
});

app.delete("/api/delete_test_file/:test_procedures_id/:file_name", (req, res) => {
    const { test_procedures_id, file_name } = req.params;

    console.log("Received DELETE request for:", test_procedures_id, file_name);

    const sqlDeleteFile = `DELETE FROM file_testcase WHERE test_procedures_id = ? AND file_testcase_name = ?`;
    const sqlDeleteRelation = `DELETE FROM file_testcsase_relation WHERE file_testcase_id IN 
        (SELECT file_testcase_id FROM file_testcase WHERE test_procedures_id = ? AND file_testcase_name = ?)`;

    db.query(sqlDeleteRelation, [test_procedures_id, file_name], (err, result) => {
        if (err) {
            console.error("Error deleting file relation:", err);
            return res.status(500).json({ error: "Failed to delete file relation" });
        }

        db.query(sqlDeleteFile, [test_procedures_id, file_name], (err, result) => {
            if (err) {
                console.error("Error deleting file:", err);
                return res.status(500).json({ error: "Failed to delete file" });
            }

            if (result.affectedRows === 0) {
                console.log("No file found with:", test_procedures_id, file_name);
                return res.status(404).json({ error: "File not found" });
            }

            res.status(200).json({ message: "File deleted successfully" });
        });
    });
});

// --------------------------- TestProcedures -------------------------------

app.get("/api/get_test_files/:test_procedures_id", async (req, res) => {
    const { test_procedures_id } = req.params;
    try {
        const [files] = await db.query("SELECT * FROM test_file WHERE test_procedures_id = ?", [test_procedures_id]);

        if (files.length === 0) {
            return res.json([]); // ✅ แทนที่จะส่ง 404 ให้ส่ง array ว่าง
        }

        res.json(files);
    } catch (error) {
        console.error("Error fetching test files:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/test-procedures", (req, res) => {
    const { testcase_id } = req.query;

    if (!testcase_id) {
        return res.status(400).json({ error: "Missing testcase_id" });
    }

    const sql = "SELECT * FROM test_procedures WHERE testcase_id = ?";
    db.query(sql, [testcase_id], (err, results) => {
        if (err) {
            console.error("Query Error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "No test procedures found" });  // << อาจทำให้ขึ้น 404
        }

        res.json(results);
    });
});

// ✅ เพิ่ม test_procedure ใหม่
app.post("/api/test-procedures", (req, res) => {
    const { testcase_id, required_action, expected_result, prerequisite } = req.body;

    // กำหนดค่าเริ่มต้นให้ test_status และ actual_result ถ้ายังไม่มี
    const test_status = req.body.test_status || "";
    const actual_result = req.body.actual_result || "";

    const insertSql = `
        INSERT INTO test_procedures (testcase_id, required_action, expected_result, prerequisite, test_status, actual_result) 
        VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(insertSql, [testcase_id, required_action, expected_result, prerequisite, test_status, actual_result], (err, result) => {
        if (err) {
            console.error("Insert Error:", err);
            return res.status(500).json({ error: "Insert failed" });
        }

        // ดึงข้อมูลที่เพิ่งเพิ่มมาแสดงกลับไป
        const newId = result.insertId;
        const selectSql = "SELECT * FROM test_procedures WHERE test_procedures_id = ?";

        db.query(selectSql, [newId], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Failed to fetch new data" });
            }
            res.status(201).json(rows[0]); // ส่งข้อมูลที่เพิ่มกลับไป
        });
    });
});

app.put("/api/test-procedures/:id", (req, res) => {
    const { id } = req.params;
    const { required_action, expected_result, prerequisite } = req.body;

    if (!required_action || !expected_result || !prerequisite) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = `
        UPDATE test_procedures 
        SET required_action = ?, expected_result = ?, prerequisite = ?, 
            test_status = '', 
            actual_result = '' 
        WHERE test_procedures_id = ?`;

    db.query(sql, [required_action, expected_result, prerequisite, id], (err, result) => {
        if (err) {
            console.error("Error updating test procedure:", err);
            return res.status(500).json({ error: "Failed to update test procedure" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Test procedure not found" });
        }

        res.status(200).json({ message: "Test procedure updated successfully, test_status and actual_result removed" });
    });
});

// ✅ ลบ test_procedure
app.delete("/api/test-procedures/:id", (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM test_procedures WHERE test_procedures_id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error("Delete Error:", err);
            return res.status(500).json({ error: "Delete failed" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Test procedure not found" });
        }
        res.json({ message: "Test procedure deleted successfully!" });
    });
});

//----------------------------------------- TESTCASE HISTORY -----------------------------------------------------
// Add History Testcase
app.post("/addHistoryTestcase", (req, res) => {
    const { testcase_id, testcase_status } = req.body;

    if (!testcase_id || !testcase_status) {
        return res.status(400).json({ message: "กรุณาระบุ 'testcase_id' และ 'testcase_status'" });
    }

    const sql = `
        INSERT INTO historytestcase (testcase_id, testcase_status, testcase_at)
        VALUES (?, ?, NOW())
    `;

    db.query(sql, [testcase_id, testcase_status], (err, result) => {
        if (err) {
            console.error("❌ Database Error:", err);
            return res.status(500).json({ message: "ไม่สามารถเพิ่มข้อมูลประวัติการออกแบบได้", error: err });
        }

        console.log(`📜 History added for testcase ID: ${testcase_id} with status: ${testcase_status}`);
        return res.status(201).json({ message: "บันทึกประวัติการออกแบบสำเร็จ!", insertedId: result.insertId });
    });
});

// Get History by Testcase ID
app.get('/getHistoryByTestcaseId', (req, res) => {
    const testcase_id = req.query.testcase_id;
    if (!testcase_id) return res.status(400).json({ message: "กรุณาระบุ 'testcase_id'" });

    const sql = `
        SELECT * FROM historytestcase
        WHERE testcase_id = ?
        ORDER BY testcase_at ASC
    `;

    db.query(sql, [testcase_id], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ message: "ไม่สามารถดึงข้อมูลประวัติการออกแบบได้" });
        }

        return res.status(200).json({ message: "ดึงข้อมูลสำเร็จ!", data: results });
    });
});


// ------------------------- VERITESTCASE -------------------------
app.post("/createveritestcase", (req, res) => {
    const veritestcaseData = req.body;
    if (!Array.isArray(veritestcaseData) || veritestcaseData.length === 0) {
        return res.status(400).json({ message: "Invalid data format or empty array." });
    }

    const projectId = veritestcaseData[0].project_id;
    const getLatestRoundQuery = `SELECT MAX(veritestcase_round) AS latestRound FROM veritestcase WHERE project_id = ?`;

    db.query(getLatestRoundQuery, [projectId], (err, results) => {
        if (err) {
            console.error("Error fetching latest veritestcase_round:", err);
            return res.status(500).json({ message: "Failed to fetch latest veritestcase_round." });
        }

        const latestRound = results[0].latestRound || 0;
        let nextRound = latestRound + 1;

        const query =
            `INSERT INTO veritestcase (project_id, veritestcase_round, create_by, testcase_id, veritestcase_at, veritestcase_by) VALUES ?`;

        const formatDateTime = (date) => {
            const d = new Date(date);
            return d.toISOString().slice(0, 19).replace("T", " ");
        };

        const values = veritestcaseData.map((item) => [
            item.project_id,
            nextRound,
            item.create_by,
            item.testcase_id,
            formatDateTime(item.veritestcase_at),
            JSON.stringify(item.veritestcase_by),
        ]);

        db.query(query, [values], (err, result) => {
            if (err) {
                console.error("Error inserting data:", err);
                return res.status(500).json({ message: "Failed to create veritestcase records." });
            }

            res.status(201).json({
                message: "Veritestcase records created successfully.",
                affectedRows: result.affectedRows,
            });
        });
    });
});


app.get("/api/test-procedures", (req, res) => {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ error: "Missing project_id" });
    }


    // แสดงข้อมูล project_id เพื่อให้ตรวจสอบ
    console.log("Received project_id:", project_id);

    const sql = `
    SELECT tp.*
    FROM test_procedures tp
    JOIN testcase tc ON tp.testcase_id = tc.testcase_id
    WHERE tc.project_id = ?
`;

    db.query(sql, [project_id], (err, results) => {
        if (err) {
            console.error("❌ Query Error:", err);
            return res.status(500).json({ error: "Database query failed" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "No test procedures found" });
        }

        res.json(results);
    });
});

// ดึงข้อมูล req_testcase ที่มี status working
app.get("/veritestcase", (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required." });
    }

    const query = `
      SELECT * 
      FROM testcase 
      WHERE project_id = ? AND BINARY testcase_status = 'WORKING';
    `;

    db.query(query, [Number(project_id)], (err, results) => {
        if (err) {
            console.error("Error fetching testcase:", err);
            return res.status(500).json({ error: "Failed to fetch testcase" });
        }
        console.log("Fetched TestCases:", results);
        res.status(200).json(results);
    });
});

app.get("/verilisttestcase", (req, res) => {
    const { project_id } = req.query;

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required." });
    }

    let query = `
      SELECT 
          vt.veritestcase_id,  
          vt.veritestcase_round,
          vt.create_by,
          vt.veritestcase_at,
          vt.testcase_id,
          vt.veritestcase_by,
          tc.testcase_status
      FROM 
          veritestcase vt
      LEFT JOIN 
          testcase tc ON vt.testcase_id = tc.testcase_id
      WHERE 
          vt.project_id = ? AND tc.testcase_status = "WAITING FOR VERIFICATION"
      ORDER BY 
          vt.veritestcase_round ASC
      LIMIT 25;
    `;

    db.query(query, [project_id], (err, results) => {
        if (err) {
            console.error("❌ Error fetching testcases:", err);
            res.status(500).json({ error: "Failed to fetch testcases" });
        } else {
            const processedResults = results.map((testcase) => {
                let veritestcaseByObject = {};

                try {
                    veritestcaseByObject = JSON.parse(testcase.veritestcase_by || "{}");
                } catch (error) {
                    console.error("Error parsing veritestcase_by:", error);
                    veritestcaseByObject = {};
                }

                return {
                    ...testcase,
                    veritestcase_by: veritestcaseByObject
                };
            });

            console.log("✅ VeriTestcase Response:", processedResults);
            res.status(200).json(processedResults);
        }
    });
});


app.get('/testcaseveri', (req, res) => {
    const { project_id, veritestcase_id, testcase_id } = req.query;

    let sql = `
      SELECT DISTINCT
        vd.veritestcase_id AS id,
        vd.project_id,
        vd.veritestcase_round,
        vd.create_by,
        vd.veritestcase_at,
        vd.veritestcase_by,
        vd.testcase_id,
        d.testcase_type,
        d.testcase_name,
        d.testcase_des,
        d.testcase_status
      FROM veritestcase vd
      LEFT JOIN testcase d ON vd.testcase_id = d.testcase_id
      WHERE vd.project_id = ?
    `;

    const params = [project_id];

    if (veritestcase_id) {
        sql += ` AND vd.veritestcase_id = ?`;
        params.push(veritestcase_id);
    }

    if (testcase_id) {
        const testcaseIds = testcase_id.split(',').map(item => item.trim());
        if (testcaseIds.length > 0) {
            sql += ` AND vd.testcase_id IN (${testcaseIds.map(() => '?').join(',')})`;
            params.push(...testcaseIds);
        }
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Error fetching testcase verification data.", error: err });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "No testcase verification data found." });
        }

        const grouped = {};

        result.forEach((row) => {
            const veritestcaseId = row.id;
            if (!grouped[veritestcaseId]) {
                grouped[veritestcaseId] = {
                    id: veritestcaseId,
                    project_id: row.project_id,
                    veritestcase_round: row.veritestcase_round,
                    create_by: row.create_by,
                    veritestcase_at: row.veritestcase_at,
                    veritestcase_by: row.veritestcase_by ? JSON.parse(row.veritestcase_by) : {}, // Ensure JSON parsing
                    testcase_id: row.testcase_id,
                    testcase_type: row.testcase_type,
                    testcase_name: row.testcase_name,
                    testcase_des: row.testcase_des,
                    testcase_status: row.testcase_status,
                };
            }
        });

        return res.status(200).json(Object.values(grouped));
    });
});

app.put('/update-veritestcase-by', async (req, res) => {
    try {
        const { veritestcaseid, veritestcaseby } = req.body;

        if (!veritestcaseid || !veritestcaseby || typeof veritestcaseby !== 'object') {
            return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง หรือรูปแบบ veritestcase_by ไม่ใช่ object" });
        }

        // 1️⃣ ค้นหา veritestcase_round ของ veritestcase_id ปัจจุบัน
        const roundSql = 'SELECT veritestcase_round FROM veritestcase WHERE veritestcase_id = ?';
        db.query(roundSql, [veritestcaseid], (roundErr, roundResult) => {
            if (roundErr) {
                console.error("❌ Database Error (ค้นหา round):", roundErr);
                return res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหา round" });
            }

            if (roundResult.length === 0) {
                return res.status(404).json({ message: "ไม่พบข้อมูล veritestcase_id นี้" });
            }

            const veritestcaseRound = roundResult[0].veritestcase_round;

            // 2️⃣ ค้นหาทุก veritestcase_id ที่อยู่ใน round เดียวกัน
            const findIdsSql = 'SELECT veritestcase_id FROM veritestcase WHERE veritestcase_round = ?';
            db.query(findIdsSql, [veritestcaseRound], (findErr, findResult) => {
                if (findErr) {
                    console.error("❌ Database Error (ค้นหา veritestcase_id ทั้งหมด):", findErr);
                    return res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหา veritestcase_id ทั้งหมด" });
                }

                const allVeritestcaseIds = findResult.map(row => row.veritestcase_id);
                if (allVeritestcaseIds.length === 0) {
                    return res.status(404).json({ message: "ไม่พบข้อมูล veritestcase_id ใน round นี้" });
                }

                console.log("✅ อัปเดต veritestcase_by สำหรับ ID:", allVeritestcaseIds);

                // 3️⃣ อัปเดตทุก veritestcase_id ใน round เดียวกัน
                const updateSql = `
                    UPDATE veritestcase
                    SET veritestcase_by = ?
                    WHERE veritestcase_round = ?
                `;
                db.query(updateSql, [JSON.stringify(veritestcaseby), veritestcaseRound], (updateErr, updateResult) => {
                    if (updateErr) {
                        console.error("❌ Database Error (อัปเดตข้อมูล):", updateErr);
                        return res.status(500).json({ message: "ไม่สามารถอัปเดตข้อมูล veritestcase_by ได้" });
                    }

                    return res.status(200).json({
                        message: "✅ อัปเดตข้อมูลสำเร็จสำหรับทุก veritestcase_id ใน round",
                        updatedIds: allVeritestcaseIds
                    });
                });
            });
        });
    } catch (error) {
        console.error("❌ Server Error:", error);
        return res.status(500).json({ message: "ข้อผิดพลาดจากเซิร์ฟเวอร์" });
    }
});

// Update status waitingforveri ของ testcase
app.put('/update-testcase-status-waitingfor-ver/:id', (req, res) => {
    const { id } = req.params;
    const { testcase_status } = req.body;

    if (!testcase_status) {
        return res.status(400).json({ message: "Missing testcase_status field." });
    }

    const query = `
      UPDATE testcase
      SET testcase_status = ?
      WHERE testcase_id = ?
    `;

    db.query(query, [testcase_status, id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Testcase not found." });
        }

        res.status(200).json({ message: "Testcase status updated successfully." });
    });
});

app.put('/update-testcase-status-verified', (req, res) => {
    const { testcase_ids, testcase_status } = req.body; // รับ testcase_ids แทน
    if (!Array.isArray(testcase_ids) || testcase_ids.length === 0) {
        return res.status(400).json({ message: "testcase_ids is required and should be a non-empty array." });
    }
    // สร้าง placeholders สำหรับ Array
    const placeholders = testcase_ids.map(() => '?').join(',');
    const sql = `
      UPDATE testcase
      SET testcase_status = ?
      WHERE testcase_id IN (${placeholders})
    `;

    // พารามิเตอร์จะเป็น testcase_status ตามด้วย testcase_ids ทั้งหมด
    const params = [testcase_status, ...testcase_ids];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Database error." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No testcase found with the provided testcase_ids." });
        }
        res.status(200).json({ message: "testcase status updated to VERIFIED successfully." });
    });
});

// get ข้อมูลเฉพาะเมื่อกดที่ verify ในหน้า View Verification
app.get("/verifytestcase", (req, res) => {
    const { testcase_id } = req.query;
    const testcaseIdsArray = testcase_id.split(",");
    let query = `SELECT * FROM testcase WHERE testcase_id IN (?)`;

    db.query(query, [testcaseIdsArray], (err, results) => {
        if (err) {
            console.error("Error fetching testcase:", err);
            res.status(500).json({ error: "Failed to fetch testcase" });
        } else {
            res.status(200).json(results);
        }
    });
});

// ในไฟล์เซิร์ฟเวอร์ของคุณ (เช่น server.js หรือ app.js)

// POST: /save-testcase-verification-result
app.post('/save-testcase-verification-result', (req, res) => {
    // ดึงข้อมูลจาก request body
    const {
        testcase_id,
        verification_checklist, // นี่คือ JSON string จาก frontend
        verify_by,             // นี่คือ JSON string จาก frontend
        project_id,
        veritestcase_id
    } = req.body;

    // ตรวจสอบข้อมูลเบื้องต้น (ควรเพิ่มการตรวจสอบให้ละเอียดขึ้น)
    if (!testcase_id || !verification_checklist || !verify_by || !project_id || !veritestcase_id) {
        return res.status(400).json({ message: 'Missing required fields for verification result.' });
    }

    // เตรียมคำสั่ง SQL (ตรวจสอบให้แน่ใจว่าชื่อคอลัมน์ตรงกับตารางของคุณ)
    // คอลัมน์ id เป็น AUTO_INCREMENT และ verify_at มี DEFAULT CURRENT_TIMESTAMP ไม่ต้องใส่ใน INSERT
    const sql = `
      INSERT INTO testcase_verification_result
      (testcase_id, verification_checklist, verify_by, project_id, veritestcase_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    // ค่าที่จะใส่ลงใน SQL query
    const values = [
        testcase_id,
        verification_checklist, // ส่ง JSON string เข้าไปโดยตรง (ฐานข้อมูล MySQL จัดการเองสำหรับ type JSON)
        verify_by,             // ส่ง JSON string เข้าไปโดยตรง
        project_id,
        veritestcase_id
    ];

    // Execute SQL query
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Database error saving verification result:", err);
            return res.status(500).json({ message: 'Failed to save testcase verification result.', error: err });
        }
        console.log("Testcase verification result saved successfully for testcase_id:", testcase_id);
        // ส่ง response กลับไปว่าสำเร็จ (อาจจะไม่ต้องทำอะไรมาก เพราะ frontend ไม่ได้รอข้อมูลอะไรกลับไปเป็นพิเศษ)
        res.status(201).json({ message: 'Testcase verification result saved successfully.' });
    });
});

// GET: ดึงข้อมูล Verification Result ล่าสุดของ Test Case
app.get('/get-testcase-verification-result', (req, res) => {
    const testcase_id = req.query.testcase_id; // รับ testcase_id จาก query parameter

    if (!testcase_id) {
        return res.status(400).json({ message: "Please provide 'testcase_id'." });
    }

    // Query ดึงข้อมูลล่าสุด (เรียงตามวันที่ verify ล่าสุด)
    const sql = `
        SELECT verification_checklist, verify_by, verify_at, veritestcase_id
        FROM testcase_verification_result
        WHERE testcase_id = ?
        ORDER BY verify_at DESC
        LIMIT 1
    `;

    db.query(sql, [testcase_id], (err, results) => {
        if (err) {
            console.error('Database Error fetching verification result:', err);
            return res.status(500).json({ message: "Failed to fetch verification result." });
        }

        if (results.length > 0) {
            // ส่งข้อมูลที่เจอรายการเดียวกลับไป
            // *** หมายเหตุสำคัญ: ตรวจสอบว่า Driver Database ของคุณคืนค่าคอลัมน์ JSON (checklist, verify_by) เป็น String หรือเป็น Object/Array ที่ Parse แล้ว ***
            // โค้ด Frontend ด้านล่างจะเขียนโดย *สมมติ* ว่า Backend ส่งมาเป็น String ก่อน
            res.status(200).json({ message: "Data retrieved successfully!", data: results[0] });
        } else {
            // ถ้าไม่เจอข้อมูล อาจจะส่ง data เป็น null หรือ object ว่าง
            res.status(200).json({ message: "No verification result found for this test case.", data: null });
            // หรือส่ง 404 Not Found ก็ได้ แล้วแต่การออกแบบ
            // return res.status(404).json({ message: "Verification result not found." });
        }
    });
});

// --- GET Test Case Verification History ---
// Make sure you have 'db' initialized (your database connection)

app.get('/veritestcase-history/:project_id', (req, res) => { // <-- Route สำหรับ Test Case
    const projectId = req.params.project_id;

    if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }

    // --- SQL Query for veritestcase table ---
    const query = `
        SELECT
            veritestcase_id, project_id, veritestcase_round, create_by,
            testcase_id, veritestcase_at, veritestcase_by
        FROM
            veritestcase  -- <-- Table: veritestcase
        WHERE
            project_id = ?
        ORDER BY
            veritestcase_at DESC;
    `;

    db.query(query, [projectId], (error, results) => {
        if (error) {
            console.error('TESTCASE_HIS DB Error:', error);
            return res.status(500).json({
                message: 'Database query failed for test case history.',
                error_details: error.message
            });
        }

        try {
            const processedResults = results.map(item => {
                // <<< --- START: CORRECTED PARSING LOGIC TO OBJECT --- >>>
                let verificationByParsed = {}; // Default to an EMPTY OBJECT {}

                console.log(`TESTCASE_HIS: Processing log ${item.veritestcase_id}. Raw veritestcase_by from DB:`, item.veritestcase_by);

                try {
                    if (item.veritestcase_by) {
                        verificationByParsed = JSON.parse(item.veritestcase_by);

                        // Check if the parsed result is a valid object (non-null, not an array)
                        if (typeof verificationByParsed !== 'object' || verificationByParsed === null || Array.isArray(verificationByParsed)) {
                            console.warn(`TESTCASE_HIS WARNING: Parsed veritestcase_by for ID ${item.veritestcase_id} is NOT a valid object:`, verificationByParsed);
                            verificationByParsed = {}; // Reset to empty object
                        } else {
                             console.log(`TESTCASE_HIS: Successfully parsed veritestcase_by for ID ${item.veritestcase_id} into object:`, verificationByParsed);
                        }
                    } else {
                        console.log(`TESTCASE_HIS: veritestcase_by for ID ${item.veritestcase_id} is null/empty in DB. Defaulting to {}.`);
                        verificationByParsed = {};
                    }
                } catch (e) {
                    console.error(`TESTCASE_HIS ERROR parsing veritestcase_by JSON for veritestcase_id ${item.veritestcase_id}:`, e.message);
                    console.error(`TESTCASE_HIS Raw data that caused error:`, item.veritestcase_by);
                    verificationByParsed = {}; // Reset to empty object on error
                }
                // <<< --- END: CORRECTED PARSING LOGIC TO OBJECT --- >>>

                // Return item with the parsed object
                return {
                    ...item, // Keep other fields
                    veritestcase_by: verificationByParsed // Assign the processed OBJECT (or {})
                };
            }); // End of map

            console.log("TESTCASE_HIS: Sending processed data to frontend.");
            res.status(200).json(processedResults);

        } catch (processingError) {
            console.error('TESTCASE_HIS Error processing results:', processingError);
            res.status(500).json({
                message: 'Error processing test case history results.',
                error_details: processingError.message
            });
        }
    }); // End db.query callback
}); // End app.get '/veritestcase-history/:project_id'
// ------------------------- Comment VeriTestcase --------------------------------
// Fetch comments for a specific VeriTestcase
app.get('/get-commentveritestcase', (req, res) => {
    const { veritestcase_id } = req.query;

    // Check if veritestcase_id is provided
    if (!veritestcase_id) {
        return res.status(400).json({ error: "veritestcase_id is required" });
    }

    console.log('Fetching comments for veritestcase_id:', veritestcase_id);

    // SQL query to fetch comments based on veritestcase_id
    const sql = `
        SELECT 
            comvertestcase_id,
            member_name,
            comvertestcase_text,
            comvertestcase_at
        FROM 
            comment_veritestcase
        WHERE 
            veritestcase_id = ?
        ORDER BY 
            comvertestcase_at DESC
    `;

    db.query(sql, [veritestcase_id], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error fetching comments", details: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "No comments found" });
        }

        // Return comments in the response
        res.status(200).json(results);
    });
});

// Add a comment to a specific veritestcase
app.post('/commentveritestcase', (req, res) => {
    const { member_name, comvertestcase_text, veritestcase_id } = req.body;
    console.log('Received data:', req.body);

    // SQL query to insert a new comment
    const sql = 'INSERT INTO comment_veritestcase (member_name, comvertestcase_text, veritestcase_id) VALUES (?, ?, ?)';

    db.query(sql, [member_name, comvertestcase_text, veritestcase_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error adding comment');
        }

        res.status(201).send('Comment added successfully');
    });
});

// Delete a specific comment by comvertestcase_id
app.delete("/delete-commentveritestcase/:comvertestcase_id", (req, res) => {
    const { comvertestcase_id } = req.params;

    // Check if comvertestcase_id is provided
    if (!comvertestcase_id) {
        return res.status(400).json({ error: "comvertestcase_id is required" });
    }

    console.log(`Deleting comment with ID: ${comvertestcase_id}`);

    // SQL query to delete the comment
    const sql = "DELETE FROM comment_veritestcase WHERE comvertestcase_id = ?";

    db.query(sql, [comvertestcase_id], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Error deleting comment", details: err.message });
        }

        // Check if the comment was found and deleted
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Return success message
        res.status(200).json({ message: "Comment deleted successfully" });
    });
});


// ------------------------- Testcase Criteria -------------------------
app.get('/testcasecriteria/:projectId', (req, res) => {
    const { projectId } = req.params; // รับ project_id จาก URL
    const sql = "SELECT * FROM testcasecriteria WHERE project_id = ?";

    db.query(sql, [projectId], (err, result) => {
        if (err) {
            console.error('Error fetching Testcase Criteria:', err);
            return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูล Testcase Criteria' });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: 'ไม่พบข้อมูล Testcase Criteria' });
        }

        res.status(200).json(result);
    });
});

app.post('/testcasecriteria', (req, res) => {
    const { testcasecri_name, project_id } = req.body; // รับ project_id มาจาก frontend

    if (!testcasecri_name || testcasecri_name.trim() === "" || !project_id) {
        return res.status(400).json({ message: "Criteria name และ project_id เป็นค่าที่จำเป็น" });
    }

    const sql = "INSERT INTO testcasecriteria (testcasecri_name, project_id) VALUES (?, ?)";
    db.query(sql, [testcasecri_name, project_id], (err, result) => {
        if (err) {
            console.error('Error adding Testcase Criteria:', err);
            return res.status(500).json({ message: "Error adding Testcase Criteria" });
        }
        res.status(201).json({ message: "Testcase Criteria added successfully", data: result });
    });
});

// Update Testcase Verification Criteria
app.put('/testcasecriteria/:id', (req, res) => {
    const { testcasecri_name } = req.body;
    const { id } = req.params;

    if (!testcasecri_name || testcasecri_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }

    const sql = "UPDATE testcasecriteria SET testcasecri_name = ? WHERE testcasecri_id = ?";
    db.query(sql, [testcasecri_name, id], (err, result) => {
        if (err) {
            console.error('Error updating Testcase Criteria:', err);
            return res.status(500).json({ message: "Error updating Testcase Criteria" });
        }
        res.status(200).json({ message: "Testcase Criteria updated successfully", data: result });
    });
});

// Delete Testcase Verification Criteria
app.delete('/testcasecriteria/:id', (req, res) => {
    const { id } = req.params;

    const checkSql = "SELECT * FROM testcasecriteria WHERE testcasecri_id = ?";
    const deleteSql = "DELETE FROM testcasecriteria WHERE testcasecri_id = ?";

    db.query(checkSql, [id], (err, result) => {
        if (err) {
            console.error('Error checking Testcase Criteria:', err);
            return res.status(500).json({ message: "Error checking Testcase Criteria" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Testcase Criteria not found" });
        }

        db.query(deleteSql, [id], (err, result) => {
            if (err) {
                console.error('Error deleting Testcase Criteria:', err);
                return res.status(500).json({ message: "Error deleting Testcase Criteria" });
            }
            res.status(200).json({ message: "Testcase Criteria deleted successfully" });
        });
    });
});

// ------------------------- Testcase Baseline -------------------------
// API สำหรับสร้าง Testcase Baseline
app.post('/createtestcasebaseline', (req, res) => {
    const { testcase_id } = req.body; // รับ testcase_id เป็น array

    // --- การตรวจสอบ Input ---
    if (!Array.isArray(testcase_id) || testcase_id.length === 0) {
        return res.status(400).json({ message: "Testcase ID is required and should be a non-empty array" });
    }

    // --- 1. หา Round ล่าสุด ---
    const findLatestBaselineRoundQuery =
        `SELECT COALESCE(MAX(baselinetestcase_round), 0) AS latest_baselinetestcase_round FROM baselinetestcase`;

    db.query(findLatestBaselineRoundQuery, (err, results) => {
        if (err) {
            console.error("Database error (fetching round):", err);
            return res.status(500).json({ message: "Failed to fetch latest baseline round", details: err.message });
        }

        const nextRound = (results[0].latest_baselinetestcase_round || 0) + 1;
        const formattedDate = new Date().toISOString().slice(0, 19).replace("T", " ");

        // เตรียมข้อมูลสำหรับ insert ลง baselinetestcase
        const baselineValues = testcase_id.map(id => [id, nextRound, formattedDate]);

        // --- 2. Insert ข้อมูลลง baselinetestcase ---
        const insertBaselineQuery =
            `INSERT INTO baselinetestcase (testcase_id, baselinetestcase_round, baselinetestcase_at) VALUES ?`;

        db.query(insertBaselineQuery, [baselineValues], (insertErr, insertResult) => {
            if (insertErr) {
                console.error("Insert baseline error:", insertErr);
                return res.status(500).json({ message: "Failed to insert baseline", details: insertErr.message });
            }

            // --- 3. Update สถานะในตาราง testcase เป็น 'BASELINE' ---
            const updateTestcaseQuery = `UPDATE testcase SET testcase_status = 'BASELINE' WHERE testcase_id IN (?)`;

            db.query(updateTestcaseQuery, [testcase_id], (updateErr, updateResult) => {
                if (updateErr) {
                    console.error("Update testcase error:", updateErr);
                    // ควรพิจารณาเรื่อง transaction หากต้องการ rollback การ insert baseline ก่อนหน้า
                    return res.status(500).json({ message: "Failed to update testcase status", details: updateErr.message });
                }

                // --- 4. Update สถานะในตาราง test_execution เป็น 'IN PROGRESS' (เพิ่มส่วนนี้เข้ามา) ---
                // *** ข้อควรระวัง: หาก test_execution_status เป็น int ให้เปลี่ยน 'IN PROGRESS' เป็นค่าตัวเลขที่ถูกต้อง ***
                const updateExecutionQuery = `UPDATE test_execution SET test_execution_status = 'IN PROGRESS' WHERE testcase_id IN (?)`;

                db.query(updateExecutionQuery, [testcase_id], (execUpdateErr, execUpdateResult) => {
                    if (execUpdateErr) {
                        console.error("Update test_execution error:", execUpdateErr);
                        // การ update testcase และ insert baseline สำเร็จแล้ว แต่ขั้นตอนนี้ล้มเหลว
                        // อาจจะส่ง response ที่บ่งบอกถึงความสำเร็จบางส่วน หรือคืน error ไปเลย
                        return res.status(500).json({ message: "Baseline created and testcase status updated, but failed to update test execution status", details: execUpdateErr.message });
                    }

                    // --- 5. ส่ง Response สำเร็จ ---
                    res.status(201).json({
                        message: "Baseline created, testcase status and execution status updated successfully",
                        insertedBaselineRows: insertResult.affectedRows,
                        updatedTestcases: updateResult.affectedRows,
                        updatedExecutions: execUpdateResult.affectedRows, // แจ้งจำนวน execution ที่อัปเดต
                        baselinetestcase: baselineValues // ข้อมูล baseline ที่ insert เข้าไป
                    });
                }); // End of update test_execution query
            }); // End of update testcase query
        }); // End of insert baseline query
    }); // End of find latest round query
});


// ดึง testcase ที่มีสถานะ VERIFIED สำหรับ Project ID
app.get("/testcaseverified/:projectId", (req, res) => {
    const { projectId } = req.params;

    if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = `SELECT * FROM testcase WHERE project_id = ? AND testcase_status = 'VERIFIED'`;

    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error("Error fetching testcases:", err);
            return res.status(500).json({ message: "Failed to fetch testcases." });
        }
        res.json(results);
    });
});

// ดึงข้อมูล testcase Baseline ตาม Project ID
app.get("/testcasebaseline", (req, res) => {
    const { project_id } = req.query;
    console.log("Received project_id:", project_id);

    if (!project_id) {
        return res.status(400).json({ error: "Project ID is required" });
    }
    const sql = `
        SELECT 
            b.baselinetestcase_id, 
            b.testcase_id, 
            b.baselinetestcase_round, 
            b.baselinetestcase_at
        FROM baselinetestcase b
        JOIN testcase d ON b.testcase_id = d.testcase_id
        WHERE d.project_id = ?
        GROUP BY b.baselinetestcase_id
    `;

    db.query(sql, [project_id], (err, results) => {
        if (err) {
            console.error("Error fetching baselines:", err);
            return res.status(500).json({ error: "Failed to fetch baselines" });
        }

        console.log("Fetched baselines:", results);

        const formattedResults = results.map((row) => ({
            baselinetestcase_id: row.baselinetestcase_id,
            testcase_id: row.testcase_id,
            baselinetestcase_round: row.baselinetestcase_round,
            baselinetestcase_at: row.baselinetestcase_at
        }));

        res.json(formattedResults);
    });
});


// ------------------------- OVERVIEW --------------------------------
// API รวม Requirements, Baseline Requirements, Design, Implementation, Test Cases
app.get("/overviewcount", (req, res) => {
    const projectId = req.query.project_id;

    if (!projectId) {
        return res.status(400).json({ error: "Missing project_id" });
    }

    // --- ปรับปรุง SQL Query ---
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM requirement WHERE project_id = ?) AS total_requirements,
            (SELECT COUNT(*) FROM requirement WHERE project_id = ? AND requirement_status = 'BASELINE') AS total_baseline_requirements,
            (SELECT COUNT(*) FROM design WHERE project_id = ?) AS total_design,
            (SELECT COUNT(*) FROM design WHERE project_id = ? AND design_status = 'BASELINE') AS total_baseline_design,
            -- เพิ่ม: นับ implementation ที่มีการเชื่อมโยง design (design_id ไม่ใช่ null และไม่ว่างเปล่า)
            (SELECT COUNT(*) FROM implementation WHERE project_id = ? AND design_id IS NOT NULL AND JSON_LENGTH(design_id) > 0) AS total_implementation, 
            -- เพิ่ม: นับ testcase ทั้งหมด
            (SELECT COUNT(*) FROM testcase WHERE project_id = ?) AS total_testcases,
            -- เพิ่ม: นับ testcase ที่เป็น BASELINE
            (SELECT COUNT(*) FROM testcase WHERE project_id = ? AND testcase_status = 'BASELINE') AS total_baseline_testcases
    `;

    // --- Parameter Array ต้องมี projectId 7 ครั้ง ---
    const params = [
        projectId, // for total_requirements
        projectId, // for total_baseline_requirements
        projectId, // for total_design
        projectId, // for total_baseline_design
        projectId, // for total_implementation
        projectId, // for total_testcases
        projectId, // for total_baseline_testcases
    ];

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            // ส่งข้อความข้อผิดพลาดที่ละเอียดขึ้น (ถ้าเป็นไปได้ใน development)
            // return res.status(500).json({ error: "Server error", details: err.message }); 
            return res.status(500).json({ error: "Server error fetching overview counts" });
        }

        // ตรวจสอบว่ามีผลลัพธ์หรือไม่
        const data = result && result.length > 0 ? result[0] : {};

        // --- ปรับปรุง Response JSON ---
        res.json({
            total_requirements: data.total_requirements || 0,
            total_baseline_requirements: data.total_baseline_requirements || 0,
            total_design: data.total_design || 0,
            total_baseline_design: data.total_baseline_design || 0,
            total_implementation: data.total_implementation || 0, // เพิ่ม key นี้
            total_testcases: data.total_testcases || 0,          // เพิ่ม key นี้
            total_baseline_testcases: data.total_baseline_testcases || 0, // เพิ่ม key นี้
        });
    });
});
// ------------------------- Traceability Criteria --------------------------------
app.post('/tracecriteria', (req, res) => {
    const { tracecriteria_name, project_id } = req.body;

    if (!tracecriteria_name || tracecriteria_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }

    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    const sql = "INSERT INTO tracecriteria (tracecriteria_name, project_id) VALUES (?, ?)";
    db.query(sql, [tracecriteria_name, project_id], (err, result) => {
        if (err) {
            console.error('Error creating tracecriteria:', err);
            return res.status(500).json({ message: "Error creating tracecriteria" });
        }
        res.status(201).json({ message: "Tracecriteria created successfully", data: result });
    });
});

// GET request to retrieve tracecriteria by project_id
app.get('/tracecriteria/:projectId', (req, res) => {
    const { projectId } = req.params;  // ดึง projectId จาก URL params
    const sql = "SELECT * FROM tracecriteria WHERE project_id = ?";

    db.query(sql, [projectId], (err, results) => {
        if (err) {
            console.error('Error fetching tracecriteria:', err);
            return res.status(500).json({ message: "ไม่สามารถดึงข้อมูล tracecriteria" });
        }

        if (results.length === 0) {
            // *** แก้ไขเล็กน้อย: ควรคืนค่า success: false ด้วยถ้าต้องการให้สอดคล้องกับ frontend ***
            // return res.status(404).json({ success: false, message: "ไม่พบข้อมูล tracecriteria" });
            return res.status(404).json({ message: "ไม่พบข้อมูล tracecriteria" }); // หรือแบบเดิมถ้า frontend ไม่เช็ค success
        }

        // *** แก้ไขเล็กน้อย: เพิ่ม success: true เพื่อให้สอดคล้องกับ frontend ***
        // res.status(200).json({ success: true, message: "Tracecriteria fetched successfully", data: results });
        res.status(200).json({ message: "Tracecriteria fetched successfully", data: results }); // หรือแบบเดิมถ้า frontend ไม่เช็ค success
    });
});

// PUT request to update an existing tracecriteria
app.put('/tracecriteria/:id', (req, res) => {
    const { id } = req.params;  // รับค่า ID จาก URL parameter
    const { tracecriteria_name, project_id } = req.body;  // รับค่า name และ project_id จาก body

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!tracecriteria_name || tracecriteria_name.trim() === "") {
        return res.status(400).json({ message: "Criteria name is required" });
    }

    if (!project_id) {
        return res.status(400).json({ message: "Project ID is required" });
    }

    // สั่ง SQL Query เพื่ออัปเดตข้อมูล
    const sql = "UPDATE tracecriteria SET tracecriteria_name = ?, project_id = ? WHERE tracecriteria_id = ?";
    db.query(sql, [tracecriteria_name, project_id, id], (err, result) => {
        if (err) {
            console.error('Error updating tracecriteria:', err);
            return res.status(500).json({ message: "Error updating tracecriteria" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tracecriteria not found" });
        }
        res.status(200).json({ message: "Tracecriteria updated successfully", data: result });
    });
});
// DELETE request to delete a tracecriteria by ID
app.delete('/tracecriteria/:id', (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM tracecriteria WHERE tracecriteria_id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting tracecriteria:', err);
            return res.status(500).json({ message: "Error deleting tracecriteria" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Tracecriteria not found" });
        }

        res.status(200).json({ message: "Tracecriteria deleted successfully" });
    });
});

// ------------------------- Traceability --------------------------------
app.get('/traceability', (req, res) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        const query = `
            SELECT
                r.requirement_id AS ReqID,
                r.requirement_name AS ReqName,
                d.design_id AS DesignID,
                d.diagram_name AS DiagramName,
                i.implement_id AS ImplementID,
                i.implement_filename AS ImplementFilename,
                t.testcase_id AS TestCaseID,
                t.testcase_name AS TestCaseName
            FROM requirement r
            JOIN design d ON (
                JSON_CONTAINS(d.requirement_id, CAST(r.requirement_id AS JSON)) 
                AND d.project_id = r.project_id
            )
            JOIN implementation i ON (
                JSON_CONTAINS(i.design_id, CAST(d.design_id AS JSON)) 
                AND i.project_id = r.project_id
            )
            JOIN testcase t ON (
                JSON_CONTAINS(t.implement_id, CAST(i.implement_id AS JSON)) -- ✅ แก้ไขตรงนี้
                AND t.project_id = r.project_id
            )
            WHERE r.project_id = ?
              AND r.requirement_status = 'BASELINE'
              AND d.design_status = 'BASELINE'
              AND t.testcase_status = 'BASELINE'
            ORDER BY
                r.requirement_id,
                d.design_id,
                i.implement_id,
                t.testcase_id;
        `;

        db.query(query, [projectId], (err, rows) => {
            if (err) {
                console.error('Error executing query for /traceability:', err);
                return res.status(500).json({ error: 'Internal Server Error', details: err.message });
            }

            // ✅ สร้างโครงสร้างข้อมูลแบบ Nested
            const requirementsMap = new Map();
            rows.forEach(row => {
                let req = requirementsMap.get(row.ReqID);
                if (!req) {
                    req = {
                        RequirementID: row.ReqID,
                        RequirementName: row.ReqName,
                        Designs: new Map()
                    };
                    requirementsMap.set(row.ReqID, req);
                }
                let design = req.Designs.get(row.DesignID);
                if (!design) {
                    design = {
                        DesignID: row.DesignID,
                        DiagramName: row.DiagramName,
                        Implementations: new Map()
                    };
                    req.Designs.set(row.DesignID, design);
                }
                let impl = design.Implementations.get(row.ImplementID);
                if (!impl) {
                    impl = {
                        ImplementID: row.ImplementID,
                        ImplementFilename: row.ImplementFilename,
                        TestCases: new Map()
                    };
                    design.Implementations.set(row.ImplementID, impl);
                }
                let tc = impl.TestCases.get(row.TestCaseID);
                if (!tc) {
                    tc = {
                        TestCaseID: row.TestCaseID,
                        TestCaseName: row.TestCaseName
                    };
                    impl.TestCases.set(row.TestCaseID, tc);
                }
            });

            // ✅ แปลง Maps เป็น Arrays
            const result = Array.from(requirementsMap.values()).map(req => {
                req.Designs = Array.from(req.Designs.values()).map(design => {
                    design.Implementations = Array.from(design.Implementations.values()).map(impl => {
                        impl.TestCases = Array.from(impl.TestCases.values());
                        return impl;
                    });
                    return design;
                });
                return req;
            });

            res.json(result);
        });

    } catch (error) {
        console.error('Error processing /traceability request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/not-linked-non-baseline', (req, res) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ error: 'Project ID is required' });
        }

        const query = `
            SELECT
                r.requirement_id AS ReqID,
                r.requirement_name AS ReqName,
                r.requirement_status AS ReqStatus,
                d.design_id AS DesignID,
                d.diagram_name AS DiagramName,
                d.design_status AS DesignStatus,
                i.implement_id AS ImplementID,
                i.implement_filename AS ImplementFilename,
                t.testcase_id AS TestCaseID,
                t.testcase_name AS TestCaseName,
                t.testcase_status AS TestCaseStatus
            FROM requirement r
            LEFT JOIN design d ON (
                JSON_CONTAINS(d.requirement_id, CAST(r.requirement_id AS JSON)) 
                AND d.project_id = r.project_id
            )
            LEFT JOIN implementation i ON (
                JSON_CONTAINS(i.design_id, CAST(d.design_id AS JSON)) 
                AND i.project_id = r.project_id
            )
            LEFT JOIN testcase t ON (
                JSON_CONTAINS(t.implement_id, CAST(i.implement_id AS JSON)) -- ✅ แก้ไขตรงนี้ให้รองรับ JSON array
                AND t.project_id = r.project_id
            )
            WHERE r.project_id = ?
            ORDER BY
                r.requirement_id,
                d.design_id,
                i.implement_id,
                t.testcase_id;
        `;

        db.query(query, [projectId], (err, rows) => {
            if (err) {
                console.error('Error executing query for /not-linked-non-baseline:', err);
                return res.status(500).json({ error: 'Internal Server Error fetching detailed links', details: err.message });
            }

            // ✅ สร้างโครงสร้างข้อมูลแบบ Nested
            const requirementsMap = new Map();
            rows.forEach(row => {
                let req = requirementsMap.get(row.ReqID);
                if (!req) {
                    req = {
                        RequirementID: row.ReqID,
                        RequirementName: row.ReqName,
                        RequirementStatus: row.ReqStatus,
                        Designs: new Map()
                    };
                    requirementsMap.set(row.ReqID, req);
                }

                if (row.DesignID !== null) {
                    let design = req.Designs.get(row.DesignID);
                    if (!design) {
                        design = {
                            DesignID: row.DesignID,
                            DiagramName: row.DiagramName,
                            DesignStatus: row.DesignStatus,
                            Implementations: new Map()
                        };
                        req.Designs.set(row.DesignID, design);
                    }

                    if (row.ImplementID !== null) {
                        let impl = design.Implementations.get(row.ImplementID);
                        if (!impl) {
                            impl = {
                                ImplementID: row.ImplementID,
                                ImplementFilename: row.ImplementFilename,
                                TestCases: new Map()
                            };
                            design.Implementations.set(row.ImplementID, impl);
                        }

                        if (row.TestCaseID !== null) {
                            let tc = impl.TestCases.get(row.TestCaseID);
                            if (!tc) {
                                tc = {
                                    TestCaseID: row.TestCaseID,
                                    TestCaseName: row.TestCaseName,
                                    TestCaseStatus: row.TestCaseStatus
                                };
                                impl.TestCases.set(row.TestCaseID, tc);
                            }
                        } // end test case check
                    } // end implementation check
                } // end design check
            }); // end forEach row

            // ✅ แปลง Maps เป็น Arrays
            const result = Array.from(requirementsMap.values()).map(req => {
                req.Designs = Array.from(req.Designs.values()).map(design => {
                    design.Implementations = Array.from(design.Implementations.values()).map(impl => {
                        impl.TestCases = Array.from(impl.TestCases.values());
                        return impl;
                    });
                    return design;
                });
                return req;
            });

            res.json(result);

        });

    } catch (error) {
        console.error('Error processing /not-linked-non-baseline request:', error);
        res.status(500).json({ error: 'Internal Server Error in processing' });
    }
});

// บันทึก Verification Trace ลง Database
app.post("/saveVerificationTrace", (req, res) => {
    // รับข้อมูล rowsToInsert จาก request body
    const { rowsToInsert } = req.body;

    // --- การตรวจสอบข้อมูลเบื้องต้น ---
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
        // ถ้าไม่มีข้อมูล หรือรูปแบบไม่ถูกต้อง
        console.error("❌ /saveVerificationTrace error: Missing or empty rowsToInsert.");
        return res.status(400).json({ success: false, message: "Missing data to insert (rowsToInsert must be a non-empty array)." });
    }

    // (ทางเลือก) ตรวจสอบโครงสร้างของ Array ย่อยแต่ละอัน
    const expectedColumns = 9; // จำนวนคอลัมน์ที่คาดหวังใน INSERT statement
    const hasInvalidRow = rowsToInsert.some(row => !Array.isArray(row) || row.length !== expectedColumns);
    if (hasInvalidRow) {
        console.error(`❌ /saveVerificationTrace error: Found row with incorrect number of elements (expected ${expectedColumns}).`);
        // ถ้ามีแถวไหนที่มีจำนวน element ไม่ตรง
        return res.status(400).json({ success: false, message: `Invalid data structure: Each inner array must have exactly ${expectedColumns} elements.` });
    }

    // --- SQL Query (ตรวจสอบลำดับคอลัมน์ให้ตรงกับข้อมูลที่ Frontend ส่งมา) ---
    const sql = `
      INSERT INTO verification_trace
      (project_id, create_by, requirement_id, design_id, implement_id, testcase_id, verification_by, veritrace_status, create_round)
      VALUES ?`; // VALUES ? สามารถรับ Array ของ Array ได้

    // --- Execute Query ---
    db.query(sql, [rowsToInsert], (err, result) => { // ส่ง [rowsToInsert] เป็น parameter ที่ 2
        if (err) {
            console.error("❌ Error saving verification trace to database:", err);
            // ส่งรหัสข้อผิดพลาดกลับไปด้วย อาจช่วยในการดีบัก
            return res.status(500).json({ success: false, message: "Database error during insert.", code: err.code });
        }

        // ตรวจสอบผลลัพธ์ (ถ้าต้องการ)
        console.log(`✅ Successfully inserted ${result.affectedRows} verification trace rows.`);

        // ส่งผลลัพธ์กลับ (ใช้ status 201 Created สำหรับการสร้างข้อมูลสำเร็จ)
        res.status(201).json({ success: true, message: "Verification Trace saved successfully", insertedCount: result.affectedRows });
    });

    // ไม่จำเป็นต้องมี try...catch ครอบ db.query เพราะ error จะถูกจัดการใน callback อยู่แล้ว
});

app.get('/getVerificationTrace', (req, res) => {
    const sql = 'SELECT * FROM verification_trace ORDER BY create_round ASC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('❌ Error fetching verification trace:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, data: results });
    });
});

// Backend: /getTableVeriTracebyRound (แก้ไขให้ดึงชื่อมาด้วย)
app.get('/getTableVeriTracebyRound', (req, res) => {
    const { project_id, create_round } = req.query;

    // --- Validate parameters ---
    if (!project_id || !create_round) { return res.status(400).json({ success: false, message: 'Project ID and Create Round are required' }); }
    const projectIdInt = parseInt(project_id, 10);
    const createRoundInt = parseInt(create_round, 10);
    if (isNaN(projectIdInt) || isNaN(createRoundInt)) { return res.status(400).json({ success: false, message: 'Project ID and Create Round must be valid numbers.' }); }

    try {
        // --- 1. SQL Query - แก้ไขให้ JOIN และ SELECT ชื่อ ---
        const query = `
            SELECT
                v.requirement_id AS ReqID,
                r.requirement_name AS ReqName,          -- << JOIN ดึง Requirement Name
                v.design_id AS DesignID,
                d.diagram_name AS DiagramName,        -- << JOIN ดึง Design Name (สมมติว่าชื่อ Diagram)
                v.implement_id AS ImplementID,
                ir.implement_filename AS ImplementFilename,
                v.testcase_id AS TestCaseID,
                t.testcase_name AS TestCaseName         -- << JOIN ดึง Test Case Name
            FROM verification_trace v
            LEFT JOIN requirement r ON v.requirement_id = r.requirement_id AND v.project_id = r.project_id -- << JOIN requirement
            LEFT JOIN design d ON v.design_id = d.design_id AND v.project_id = d.project_id          -- << JOIN design
            LEFT JOIN implementation ir ON v.implement_id = ir.implement_id AND v.project_id = ir.project_id -- << JOIN implementation
            LEFT JOIN testcase t ON v.testcase_id = t.testcase_id AND v.project_id = t.project_id      -- << JOIN testcase
            WHERE v.project_id = ? AND v.create_round = ?
            ORDER BY
                v.requirement_id, v.design_id, v.implement_id, v.testcase_id;
        `;

        db.query(query, [projectIdInt, createRoundInt], (err, rows) => {
            if (err) {
                console.error('❌ Error fetching /getTableVeriTracebyRound details (with names):', err);
                return res.status(500).json({ success: false, message: 'Database error fetching verification details for round.' });
            }
            if (rows.length === 0) { return res.json({ success: true, data: [] }); }

            // --- 2. Process Rows - ใช้ชื่อที่ดึงมา ---
            const requirementsMap = new Map();
            rows.forEach(row => {
                // ดึงชื่อที่ SELECT มาใหม่ด้วย
                const { ReqID, ReqName, DesignID, DiagramName, ImplementID, ImplementFilename, TestCaseID, TestCaseName } = row;

                if (ReqID === null) return;

                let req = requirementsMap.get(ReqID);
                if (!req) {
                    req = {
                        RequirementID: ReqID,
                        RequirementName: ReqName || `Requirement ${ReqID}`, // << ใช้ ReqName
                        Designs: new Map()
                    };
                    requirementsMap.set(ReqID, req);
                }

                if (DesignID !== null) {
                    let design = req.Designs.get(DesignID);
                    if (!design) {
                        design = {
                            DesignID: DesignID,
                            DiagramName: DiagramName || `Design ${DesignID}`, // << ใช้ DiagramName
                            Implementations: new Map()
                        };
                        req.Designs.set(DesignID, design);
                    }

                    if (ImplementID !== null) {
                        let impl = design.Implementations.get(ImplementID);
                        if (!impl) {
                            impl = {
                                ImplementID: ImplementID,
                                ImplementFilename: ImplementFilename || 'N/A',
                                TestCases: new Map()
                            };
                            design.Implementations.set(ImplementID, impl);
                        }

                        if (TestCaseID !== null) {
                            let tc = impl.TestCases.get(TestCaseID);
                            if (!tc) {
                                tc = {
                                    TestCaseID: TestCaseID,
                                    TestCaseName: TestCaseName || `Test Case ${TestCaseID}` // << ใช้ TestCaseName
                                };
                                impl.TestCases.set(TestCaseID, tc);
                            }
                        } // end tc
                    } // end impl
                } // end design
            }); // end forEach

            // --- 3. Convert Maps to Arrays (เหมือนเดิม) ---
            const convertedResult = Array.from(requirementsMap.values()).map(req => {
                req.Designs = Array.from(req.Designs.values()).map(design => {
                    design.Implementations = Array.from(design.Implementations.values()).map(impl => {
                        impl.TestCases = Array.from(impl.TestCases.values()); return impl;
                    }); return design;
                }); return req;
            });

            // --- 4. Send Nested JSON Result (ที่มีชื่อแล้ว) ---
            console.log(`Processed /getTableVeriTracebyRound Data (with names) for project ${projectIdInt}, round ${createRoundInt}:`, JSON.stringify(convertedResult, null, 2));
            res.json({ success: true, data: convertedResult });

        }); // end db.query callback
    } catch (error) {
        console.error('Error processing /getTableVeriTracebyRound request (with names):', error);
        res.status(500).json({ success: false, message: 'Internal Server Error processing request' });
    }
});

app.put('/update-round-verification', (req, res) => {
    const { project_id, create_round, reviewer_name } = req.body; // reviewer_name คือคนที่กด

    // ... (ส่วนตรวจสอบข้อมูล, SELECT ข้อมูลเดิม เหมือนเดิม) ...
    if (!project_id || !create_round || !reviewer_name) { /*...*/ }
    console.log(`🔄 [Verify] Request: Project ${project_id}, Round ${create_round}, Reviewer: ${reviewer_name}`);
    const selectQuery = `SELECT veritrace_id, verification_by FROM verification_trace WHERE project_id = ? AND create_round = ?;`;
    db.query(selectQuery, [project_id, create_round], (err, results) => {
        if (err) { /*...*/ }
        if (results.length === 0) { /*...*/ }
        console.log(`🔍 [Verify] Found ${results.length} trace records...`);

        const updatePromises = results.map(record => {
            return new Promise((resolve, reject) => {
                let verificationBy;
                try { verificationBy = JSON.parse(record.verification_by || "{}"); }
                catch (parseError) { /*...*/ verificationBy = {}; }

                verificationBy[reviewer_name] = true; // อัปเดตคนปัจจุบัน
                const updatedVerificationByJson = JSON.stringify(verificationBy);
                const allReviewed = Object.keys(verificationBy).length > 0 && Object.values(verificationBy).every(status => status === true);
                const newStatus = allReviewed ? "VERIFIED" : "WAITING FOR VERIFICATION";

                // *** เก็บ Keys (รายชื่อ Reviewer ทั้งหมดใน JSON นี้) ไว้เพื่อใช้ภายหลัง ***
                const currentReviewersInRecord = Object.keys(verificationBy);

                const updateQuery = `UPDATE verification_trace SET verification_by = ?, veritrace_status = ? WHERE veritrace_id = ?;`;
                db.query(updateQuery, [updatedVerificationByJson, newStatus, record.veritrace_id], (updateErr, updateResult) => {
                    if (updateErr) { /*...*/ reject(/*...*/); }
                    else {
                        /*...*/
                        // *** ส่งรายชื่อ Reviewer ทั้งหมดกลับไปพร้อมผลลัพธ์ของ Promise นี้ด้วย ***
                        resolve({
                            veritrace_id: record.veritrace_id,
                            finalStatus: newStatus,
                            allReviewers: currentReviewersInRecord, // <-- ส่งรายชื่อไปด้วย
                            success: true
                        });
                    }
                });
            });
        });

        Promise.all(updatePromises)
            .then(updateResults => {
                const successfulUpdates = updateResults.filter(r => r.success).length;
                // เช็คว่าทุก record ที่สำเร็จ มีสถานะสุดท้ายเป็น VERIFIED หรือไม่
                const allNowVerified = successfulUpdates === results.length && updateResults.every(r => r.success && r.finalStatus === "VERIFIED");

                console.log(`🏁 [Verify] Finished. ${successfulUpdates}/${results.length} records updated. All verified: ${allNowVerified}`);

                if (allNowVerified) {
                    console.log(`✍️ [Verify] All records verified. Saving criteria list AND all verifiers...`);

                    // *** ดึงรายชื่อ Reviewer ทั้งหมดจากผลลัพธ์ (เอาจากรายการแรกที่สำเร็จก็น่าจะพอ) ***
                    const allVerifierNames = updateResults[0]?.allReviewers || []; // ควรมีอย่างน้อย 1 รายการถ้า allNowVerified เป็น true
                    if (allVerifierNames.length === 0) {
                        console.error("❌ Could not determine the list of all verifiers!");
                        // อาจจะยังคงดำเนินการต่อโดยใช้แค่ reviewer_name หรือแจ้ง Error
                    }
                    const allVerifiersJson = JSON.stringify(allVerifierNames); // แปลง Array เป็น JSON String

                    // 1. ดึงรายชื่อ Criteria ปัจจุบัน (เหมือนเดิม)
                    const criteriaQuery = `SELECT tracecriteria_name FROM tracecriteria WHERE project_id = ? ORDER BY tracecriteria_id;`;
                    db.query(criteriaQuery, [project_id], (criteriaErr, criteriaResults) => {
                        if (criteriaErr) { /* ... Error handling (เหมือนเดิม) ... */ }

                        const criteriaNames = criteriaResults.map(row => row.tracecriteria_name);
                        const criteriaNamesJson = JSON.stringify(criteriaNames);

                        // 2. บันทึก (UPSERT) ลงตาราง round_verified_criteria
                        // *** แก้ไข: ใช้ allVerifiersJson แทน reviewer_name ในคอลัมน์ verified_by ***
                        const upsertSql = `
                            INSERT INTO round_verified_criteria (project_id, create_round, criteria_names_json, verified_by, verified_at)
                            VALUES (?, ?, ?, ?, NOW()) -- ใช้ verified_by (ที่แก้ Type เป็น TEXT แล้ว)
                            ON DUPLICATE KEY UPDATE
                                criteria_names_json = VALUES(criteria_names_json),
                                verified_by = VALUES(verified_by), -- อัปเดตด้วยรายชื่อทั้งหมด
                                verified_at = NOW();
                        `;

                        // *** ส่ง allVerifiersJson เข้าไปแทน reviewer_name ***
                        db.query(upsertSql, [project_id, create_round, criteriaNamesJson, allVerifiersJson], (upsertErr, upsertResult) => {
                            if (upsertErr) { /* ... Error handling (เหมือนเดิม) ... */ }

                            console.log(`💾 [Verify] Verified criteria list & all verifiers saved for Project ${project_id}, Round ${create_round}.`);
                            res.json({
                                success: true,
                                message: `ยืนยันสถานะรอบ ${create_round} และบันทึกข้อมูลเรียบร้อยแล้ว`,
                                updated_count: successfulUpdates
                            });
                        });
                    });

                } else {
                    // กรณีอัปเดตสำเร็จบางส่วน หรือ ยังไม่ครบทุกคน (ยังไม่ VERIFIED ทั้งหมด)
                    // หรือมี Error เกิดขึ้นระหว่าง update ทำให้ successfulUpdates != results.length
                    // เราจะถือว่าการ Verify รอบยังไม่สมบูรณ์ในภาพรวม
                    res.json({
                        success: true, // การอัปเดต (บางส่วน หรือทั้งหมด แต่ยังไม่ Verify) สำเร็จ
                        message: `อัปเดตสถานะสำหรับ ${successfulUpdates} รายการในรอบ ${create_round} สำเร็จ ${successfulUpdates === results.length ? '(รอการยืนยันจากผู้อื่น)' : '(มีข้อผิดพลาดบางส่วน)'}`,
                        updated_count: successfulUpdates
                    });
                }
            })
            .catch(error => {
                // หากมี Promise ใด reject (เกิด Error ตอน Update) จะเข้ามาที่นี่
                console.error("❌ Error during Promise.all updates:", error);
                res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดระหว่างการอัปเดตสถานะ Trace", error: error });
            });
    });
});

app.get('/getTableVerificationTrace', (req, res) => {
    const { project_id, veritrace_id, create_round } = req.query;

    // ตรวจสอบว่า query string create_round ถูกส่งมาหรือไม่
    const query = `
      SELECT veritrace_id, project_id, create_by, requirement_id, design_id, implement_id, testcase_id, 
             create_round, verification_at, verification_by, veritrace_status
      FROM verification_trace
      WHERE project_id = ? AND veritrace_id = ?
      ${create_round ? 'AND create_round = ?' : ''}
    `;

    const params = [project_id, veritrace_id];
    if (create_round) params.push(create_round); // เพิ่มค่า create_round ใน query หากมี

    db.query(query, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Server error' });
        }

        res.json({ success: true, data: result });
    });
});

app.get('/getMaxBaselineRound/:projectId', (req, res) => {
    const { projectId } = req.params;
    const query = `SELECT MAX(baselinetrace_round) as maxRound FROM baselinetrace WHERE project_id = ?`;
    db.query(query, [projectId], (err, result) => {
        if (err) {
            console.error("Error getting max baseline round:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        return res.json({ success: true, maxRound: result[0].maxRound });
    });
});

// Endpoint: อัปเดตสถานะ veritrace_status สำหรับ Round ที่ระบุ
app.put('/updateVerificationStatusByRound', (req, res) => {
    // 1. ดึงข้อมูลจาก Request Body
    const { project_id, create_round, new_status } = req.body;

    // 2. ตรวจสอบ Input ที่จำเป็น
    if (!project_id || !create_round || !new_status) {
        // ถ้าข้อมูลที่จำเป็น (project_id, create_round, new_status) ไม่ครบ
        return res.status(400).json({
            success: false,
            message: 'Missing required fields in request body: project_id, create_round, new_status'
        });
    }

    // 3. ตรวจสอบค่า Status ที่ต้องการ (สำหรับกรณีนี้ ต้องเป็น "BASELINE")
    if (new_status !== "BASELINE") {
        return res.status(400).json({
            success: false,
            message: `Invalid new_status value provided ('${new_status}'). Only 'BASELINE' is permitted by this endpoint.`
        });
    }

    // 4. แปลง ID และ Round เป็นตัวเลข และตรวจสอบ
    const projectIdInt = parseInt(project_id, 10);
    const createRoundInt = parseInt(create_round, 10);

    if (isNaN(projectIdInt) || isNaN(createRoundInt)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid project_id or create_round. Both must be valid numbers.'
        });
    }

    const query = `
        UPDATE verification_trace
        SET veritrace_status = ?
        WHERE project_id = ? AND create_round = ?
    `;
    const params = [new_status, projectIdInt, createRoundInt];

    // 6. สั่ง Query ไปยัง Database (สมมติว่าตัวแปร db คือ connection object ของคุณ)
    db.query(query, params, (err, result) => {
        // 7. จัดการ Error จาก Database
        if (err) {
            console.error('❌ Database error updating verification_trace status by round:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error occurred while updating verification status.'
            });
        }

        // 8. ส่ง Response กลับไปว่าสำเร็จ
        // result.affectedRows บอกว่ามีกี่แถวที่ถูกอัปเดต
        console.log(`✅ Status updated to "${new_status}" for project ${projectIdInt}, round ${createRoundInt}. Affected rows: ${result.affectedRows}`);
        res.status(200).json({
            success: true,
            message: `Status for round ${createRoundInt} successfully updated to ${new_status}.`,
            affectedRows: result.affectedRows
        });
    });
});

app.post('/saveBaselineTrace', (req, res) => {
    // 1. ดึงข้อมูลจาก Request Body (ใช้ 'create_round' สำหรับ source round)
    const {
        project_id,
        requirement_id,
        design_id,
        implement_id,
        testcase_id,
        baselinetrace_by,
        baselinetrace_round, // Round ของ Baseline ใหม่
        create_round         // Round ต้นฉบับ (ตามที่ Frontend ส่งมา)
    } = req.body;

    // 2. ตรวจสอบ Input (รวม 'create_round')
    if (!project_id || !requirement_id || !design_id || !baselinetrace_by || !baselinetrace_round || create_round === undefined || create_round === null) {
        return res.status(400).json({ success: false, message: 'Missing required fields (project_id, requirement_id, design_id, baselinetrace_by, baselinetrace_round, create_round)' });
    }

    // 2.1 ตรวจสอบและแปลงค่าตัวเลข
    const projectIdInt = parseInt(project_id, 10);
    const requirementIdInt = parseInt(requirement_id, 10);
    const designIdInt = parseInt(design_id, 10);
    const implementIdInt = implement_id != null ? parseInt(implement_id, 10) : null;
    const testcaseIdInt = testcase_id != null ? parseInt(testcase_id, 10) : null;
    const baselineRoundInt = parseInt(baselinetrace_round, 10);
    const sourceCreateRoundInt = parseInt(create_round, 10); // แปลงค่า source round ที่รับมาเป็น create_round

    if (isNaN(projectIdInt) || isNaN(requirementIdInt) || isNaN(designIdInt) ||
        isNaN(baselineRoundInt) || isNaN(sourceCreateRoundInt) ||
        (implement_id != null && isNaN(implementIdInt)) ||
        (testcase_id != null && isNaN(testcaseIdInt))
    ) {
        return res.status(400).json({ success: false, message: 'Invalid numeric value for one or more ID/Round fields.' });
    }


    // 3. แก้ไข SQL INSERT ให้ใช้ column 'create_round' สำหรับ source round
    // *** สำคัญ: ตรวจสอบให้แน่ใจว่าตาราง 'baselinetrace' ของคุณมีคอลัมน์ชื่อ 'create_round' จริงๆ สำหรับเก็บค่านี้ ***
    // *** ถ้าชื่อคอลัมน์ใน DB ไม่ใช่ 'create_round' ให้แก้ชื่อใน SQL ให้ตรงกับ DB ***
    const query = `
        INSERT INTO baselinetrace (
            project_id, requirement_id, design_id, implement_id, testcase_id,
            baselinetrace_by, baselinetrace_round,
            create_round          -- ใช้ชื่อคอลัมน์ 'create_round' ตามที่คุณต้องการ
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // 4. แก้ไข Parameters ให้ตรงกับ SQL
    const params = [
        projectIdInt, requirementIdInt, designIdInt, implementIdInt, testcaseIdInt,
        baselinetrace_by,
        baselineRoundInt,       // NEW baseline round
        sourceCreateRoundInt    // SOURCE verification round (จาก field 'create_round' ใน req.body)
    ];

    // 5. Execute INSERT Query
    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error inserting baseline trace:", err);
            return res.status(500).json({ success: false, message: 'Database error saving baseline record.' });
        }

        // 6. ส่วน UPDATE ถูกลบออกไปแล้ว

        // 7. ส่ง Response สำเร็จสำหรับการ INSERT เท่านั้น
        return res.json({
            success: true,
            message: 'Baseline record saved successfully.',
            insertedId: result.insertId
        });
    });
});

app.get('/viewBaselineTrace', (req, res) => {
    const projectId = req.query.project_id;

    if (!projectId) {
        // Bad Request ถ้าไม่มี project_id
        return res.status(400).json({ success: false, message: 'Missing project_id' });
    }

    // 1. ดึงชื่อโปรเจกต์ก่อน
    const projectQuery = `SELECT project_name FROM project WHERE project_id = ?`;
    db.query(projectQuery, [projectId], (err, projectResults) => {
        if (err) {
            // Database Error ตอนดึงชื่อโปรเจกต์
            console.error("❌ Database error fetching project name:", err);
            // ส่ง Error 500 แต่ไม่จำเป็นต้องส่ง project_name เพราะยังไม่ได้มา
            return res.status(500).json({ success: false, message: "Database error" });
        }

        if (projectResults.length === 0) {
            // ไม่พบโปรเจกต์สำหรับ project_id นี้เลย
            return res.status(404).json({ success: false, message: "Project not found for this project_id" });
        }

        // เก็บชื่อโปรเจกต์ไว้
        const projectName = projectResults[0].project_name;

        // 2. ดึงข้อมูล baseline trace (เมื่อรู้ว่าโปรเจกต์มีอยู่จริง)
        const baselineQuery = `SELECT baselinetrace_round, baselinetrace_by, baselinetrace_at FROM baselinetrace WHERE project_id = ? ORDER BY baselinetrace_round ASC`; // อาจจะเรียงลำดับด้วย
        db.query(baselineQuery, [projectId], (err, baselineResults) => {
            if (err) {
                // Database Error ตอนดึงข้อมูล Baseline
                console.error("❌ Database error fetching baselines:", err);
                // ส่ง Error 500 แต่ยังคงส่งชื่อโปรเจกต์ที่เคยดึงได้กลับไปได้
                return res.status(500).json({
                    success: false,
                    project_name: projectName, // ส่งชื่อกลับไป แม้จะเกิด Error ตอนดึง Baseline
                    message: "Database error while fetching baselines"
                });
            }

            // --- จุดที่แก้ไข ---
            // ไม่ต้องเช็ค baselineResults.length === 0 เพื่อส่ง 404 แล้ว
            // ส่งข้อมูลกลับเสมอ (baselineResults จะเป็น [] ถ้าไม่มีข้อมูล)

            res.status(200).json({ // ระบุ 200 OK ชัดเจน
                success: true,
                project_name: projectName,
                data: baselineResults // baselineResults จะเป็น array ว่าง ถ้าไม่มีข้อมูล
            });
        });
    });
});

// Backend: /viewBaselineTraceDetail (แก้ไขให้คืนค่า Nested Structure + Names)
app.get('/viewBaselineTraceDetail', (req, res) => {
    const projectId = req.query.project_id;
    const round = req.query.round; // baselinetrace_round

    // --- ตรวจสอบ Input Parameters ---
    if (!projectId || !round) { return res.status(400).json({ success: false, message: 'Project ID and Round are required' }); }
    const projectIdInt = parseInt(projectId, 10);
    const roundInt = parseInt(round, 10);
    if (isNaN(projectIdInt) || isNaN(roundInt)) { return res.status(400).json({ success: false, message: 'Project ID and Round must be valid numbers.' }); }

    // --- 1. SQL Query: แก้ไขให้ JOIN และ SELECT ชื่อ ---
    const sqlQuery = `
        SELECT
            b.requirement_id AS ReqID,
            r.requirement_name AS ReqName,          -- << JOIN ดึง Requirement Name
            b.design_id AS DesignID,
            d.diagram_name AS DiagramName,        -- << JOIN ดึง Design Name
            b.implement_id AS ImplementID,
            ir.implement_filename AS ImplementFilename,
            b.testcase_id AS TestCaseID,
            t.testcase_name AS TestCaseName         -- << JOIN ดึง Test Case Name
        FROM baselinetrace b
        LEFT JOIN requirement r ON b.requirement_id = r.requirement_id AND b.project_id = r.project_id -- << JOIN requirement
        LEFT JOIN design d ON b.design_id = d.design_id AND b.project_id = d.project_id          -- << JOIN design
        LEFT JOIN implementation ir ON b.implement_id = ir.implement_id AND b.project_id = ir.project_id -- << JOIN implementation
        LEFT JOIN testcase t ON b.testcase_id = t.testcase_id AND b.project_id = t.project_id      -- << JOIN testcase
        WHERE b.project_id = ? AND b.baselinetrace_round = ?
        ORDER BY
            b.requirement_id, b.design_id, b.implement_id, b.testcase_id;
    `;

    db.query(sqlQuery, [projectIdInt, roundInt], (err, rows) => {
        if (err) { console.error('❌ Error fetching baseline trace detail:', err); return res.status(500).json({ success: false, message: 'Database error fetching baseline trace data' }); }
        if (rows.length === 0) { return res.json({ success: true, data: [] }); }

        // --- 2. Process Rows: ใช้ชื่อที่ดึงมา ---
        const requirementsMap = new Map();
        rows.forEach(row => {
            const { ReqID, ReqName, DesignID, DiagramName, ImplementID, ImplementFilename, TestCaseID, TestCaseName } = row; // ดึงชื่อมาด้วย
            if (ReqID === null) return;
            let req = requirementsMap.get(ReqID);
            if (!req) {
                req = { RequirementID: ReqID, RequirementName: ReqName || `Requirement ${ReqID}`, Designs: new Map() }; // << ใช้ ReqName
                requirementsMap.set(ReqID, req);
            }
            if (DesignID !== null) {
                let design = req.Designs.get(DesignID);
                if (!design) {
                    design = { DesignID: DesignID, DiagramName: DiagramName || `Design ${DesignID}`, Implementations: new Map() }; // << ใช้ DiagramName
                    req.Designs.set(DesignID, design);
                }
                if (ImplementID !== null) {
                    let impl = design.Implementations.get(ImplementID);
                    if (!impl) { impl = { ImplementID: ImplementID, ImplementFilename: ImplementFilename || 'N/A', TestCases: new Map() }; design.Implementations.set(ImplementID, impl); }
                    if (TestCaseID !== null) {
                        let tc = impl.TestCases.get(TestCaseID);
                        if (!tc) {
                            tc = { TestCaseID: TestCaseID, TestCaseName: TestCaseName || `Test Case ${TestCaseID}` }; // << ใช้ TestCaseName
                            impl.TestCases.set(TestCaseID, tc);
                        }
                    }
                }
            }
        });

        // --- 3. Convert Maps to Arrays (เหมือนเดิม) ---
        const convertedResult = Array.from(requirementsMap.values()).map(req => { /* ... */ });
        /* Full conversion logic */
        const fullConvertedResult = Array.from(requirementsMap.values()).map(req => {
            req.Designs = Array.from(req.Designs.values()).map(design => {
                design.Implementations = Array.from(design.Implementations.values()).map(impl => {
                    impl.TestCases = Array.from(impl.TestCases.values());
                    return impl;
                }); return design;
            }); return req;
        });


        // --- 4. ส่งข้อมูลแบบ Nested กลับไป (ที่มีชื่อแล้ว) ---
        res.json({ success: true, data: fullConvertedResult });
    });
});

// Backend: /showCriteriaTraceVersion (แก้ไขให้จัดการ verified_by เป็น Array<string>)
app.get('/showCriteriaTraceVersion', (req, res) => {
    const { project_id, create_round } = req.query;

    // --- Validation ---
    if (!project_id || !create_round) { /* ... */ }
    const projectIdInt = parseInt(project_id, 10);
    const createRoundInt = parseInt(create_round, 10);
    if (isNaN(projectIdInt) || isNaN(createRoundInt)) { /* ... */ }

    // --- SQL Query (เหมือนเดิม) ---
    const query = `
        SELECT criteria_names_json, verified_by
        FROM round_verified_criteria
        WHERE project_id = ? AND create_round = ?
        LIMIT 1;
    `;

    db.query(query, [projectIdInt, createRoundInt], (err, results) => {
        if (err) { /* ... handle DB error ... */ }

        let criteriaNamesArray = [];
        let reviewerNamesArray = []; // <<--- ใช้ Array ว่างเป็นค่าเริ่มต้น

        if (results.length > 0) {
            const record = results[0];

            // Parse Criteria JSON (เหมือนเดิม)
            if (record.criteria_names_json) {
                try {
                    const parsedCriteria = JSON.parse(record.criteria_names_json);
                    if (Array.isArray(parsedCriteria)) { criteriaNamesArray = parsedCriteria; }
                    else { console.warn(/*...*/); }
                } catch (parseError) { console.error(/*...*/); }
            }

            // *** Parse Reviewers JSON (verified_by) - คาดหวัง Array<string> ***
            if (record.verified_by) {
                try {
                    const parsedReviewers = JSON.parse(record.verified_by);
                    // *** ตรวจสอบว่าเป็น Array ***
                    if (Array.isArray(parsedReviewers)) {
                        // กรองให้แน่ใจว่าเป็น String (ถ้าต้องการ)
                        reviewerNamesArray = parsedReviewers.filter(name => typeof name === 'string');
                    } else {
                        console.warn(`Parsed verified_by is not an array for project ${projectIdInt}, round ${createRoundInt}`);
                    }
                } catch (parseError) {
                    console.error(`❌ Error parsing verified_by (expected array) for project ${projectIdInt}, round ${createRoundInt}:`, parseError);
                }
            }
        }

        // --- ส่ง Response กลับไปในรูปแบบ Object ---
        res.json({
            success: true,
            data: {
                criteria: criteriaNamesArray,
                reviewerNames: reviewerNamesArray // <<--- เปลี่ยนชื่อ Key เป็น reviewerNames
            }
        });
    });
});

app.get('/veritrace-history/:project_id', (req, res) => {
    const projectId = req.params.project_id;

    // --- Input Validation ---
    if (!projectId || isNaN(parseInt(projectId))) {
        console.warn(`VERITRACE_HIS API: Received invalid Project ID: ${projectId}`);
        return res.status(400).json({ message: 'Invalid Project ID provided.' });
    }
    console.log(`VERITRACE_HIS API: Request received for project ID: ${projectId}`);

    // --- SQL Query for verification_trace table ---
    const query = `
        SELECT
            veritrace_id,
            project_id,
            create_by,
            requirement_id,
            design_id,
            implement_id,
            testcase_id,
            verification_at,
            verification_by,   -- Expecting JSON string like '{"user":true, ...}' or NULL
            veritrace_status,
            create_round
        FROM
            verification_trace -- The table name from your screenshot
        WHERE
            project_id = ?
        ORDER BY
            verification_at DESC; -- Or order by veritrace_id DESC / create_round DESC
    `;

    // --- Execute Database Query ---
    db.query(query, [projectId], (error, results) => {

        // 1. Handle Database Query Error
        if (error) {
            console.error('VERITRACE_HIS API DB Error:', error);
            return res.status(500).json({
                message: 'Database query failed while fetching traceability history.',
                error_code: error.code,
                error_details: error.sqlMessage || error.message
            });
        }

        console.log(`VERITRACE_HIS API: DB query successful for project ${projectId}. Found ${results.length} records.`);

        // 2. Process Results (Parse JSON)
        try {
            const processedResults = results.map(item => {
                let verificationByParsed = {}; // Default to an EMPTY OBJECT {}

                // Add detailed logging for the raw value from DB
                // console.log(`VERITRACE_HIS API: Processing trace ID ${item.veritrace_id}. Raw verification_by:`, item.verification_by);

                try {
                    // Check if the column has a non-empty value
                    if (item.verification_by) {
                        // Attempt to parse the JSON string from the DB
                        verificationByParsed = JSON.parse(item.verification_by);

                        // **Important:** Check if the parsed result is a valid object
                        if (typeof verificationByParsed !== 'object' || verificationByParsed === null || Array.isArray(verificationByParsed)) {
                            console.warn(`VERITRACE_HIS API WARNING: Parsed verification_by for trace ID ${item.veritrace_id} is NOT a valid object:`, verificationByParsed);
                            verificationByParsed = {}; // Reset to empty object if not a valid object
                        }
                         // else {
                         //    console.log(`VERITRACE_HIS API: Successfully parsed verification_by for trace ID ${item.veritrace_id} into object:`, verificationByParsed);
                         // }
                    } else {
                        // If the DB column is NULL or empty, keep it as an empty object
                        // console.log(`VERITRACE_HIS API: verification_by for trace ID ${item.veritrace_id} is null/empty in DB. Defaulting to {}.`);
                        verificationByParsed = {};
                    }
                } catch (e) {
                    // Handle errors during JSON.parse
                    console.error(`VERITRACE_HIS API ERROR parsing verification_by JSON for trace ID ${item.veritrace_id}:`, e.message);
                    console.error(`VERITRACE_HIS API Raw data that caused error:`, item.verification_by);
                    verificationByParsed = {}; // Reset to empty object on error
                }

                // Return the complete item with the parsed object
                return {
                    ...item, // Keep all other fields from the database query
                    verification_by: verificationByParsed // Replace the original string/null with the parsed object {}
                };
            }); // End of map

            // 3. Send the final processed results
            console.log(`VERITRACE_HIS API: Sending ${processedResults.length} processed records to frontend.`);
            res.status(200).json(processedResults);

        } catch (processingError) {
            // 4. Handle unexpected errors during the .map() processing phase
            console.error('VERITRACE_HIS API Error processing results after query:', processingError);
            res.status(500).json({
                 message: 'Server error processing traceability history results.',
                 error_details: processingError.message
            });
        }
    }); // End of db.query callback
}); // End of app.get '/veritrace-history/:project_id'
// -----------------------Comment Traceability------------------------------------------------------------------------------------------
// GET Endpoint: ดึง Comments สำหรับ Project และ Round ที่ระบุ
app.get('/verificationComments', (req, res) => {
    const { project_id, create_round } = req.query;

    // --- Validation ---
    if (!project_id || !create_round) { return res.status(400).json({ success: false, message: 'Project ID and Create Round are required' }); }
    const projectIdInt = parseInt(project_id, 10);
    const createRoundInt = parseInt(create_round, 10);
    if (isNaN(projectIdInt) || isNaN(createRoundInt)) { return res.status(400).json({ success: false, message: 'Project ID and Create Round must be valid numbers.' }); }

    const query = `
        SELECT comment_id, project_id, create_round, comment_text, comment_by, comment_at
        FROM comment_veritraceability
        WHERE project_id = ? AND create_round = ?
        ORDER BY comment_at ASC; -- เรียงตามเวลาจากเก่าไปใหม่
    `;

    db.query(query, [projectIdInt, createRoundInt], (err, results) => {
        if (err) {
            console.error('❌ Error fetching verification comments:', err);
            return res.status(500).json({ success: false, message: 'Database error fetching comments.' });
        }
        res.json({ success: true, data: results }); // ส่งข้อมูล Array กลับไป
    });
});

// POST Endpoint: บันทึก Comment ใหม่
app.post('/verificationComments', (req, res) => {
    const { project_id, create_round, comment_text, comment_by } = req.body;

    // --- Validation ---
    if (!project_id || !create_round || !comment_text || !comment_by) {
        return res.status(400).json({ success: false, message: 'Missing required fields: project_id, create_round, comment_text, comment_by' });
    }
    if (typeof comment_text !== 'string' || comment_text.trim() === '') {
        return res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
    }
    const projectIdInt = parseInt(project_id, 10);
    const createRoundInt = parseInt(create_round, 10);
    if (isNaN(projectIdInt) || isNaN(createRoundInt)) { return res.status(400).json({ success: false, message: 'Invalid Project ID or Create Round.' }); }


    const query = `
        INSERT INTO comment_veritraceability (project_id, create_round, comment_text, comment_by)
        VALUES (?, ?, ?, ?);
    `;
    const params = [projectIdInt, createRoundInt, comment_text.trim(), comment_by];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error('❌ Error inserting verification comment:', err);
            return res.status(500).json({ success: false, message: 'Database error saving comment.' });
        }
        if (result.affectedRows === 1) {
            res.status(201).json({ success: true, message: 'Comment added successfully.', commentId: result.insertId }); // ส่ง 201 Created
        } else {
            res.status(500).json({ success: false, message: 'Failed to save comment.' });
        }
    });
});

app.delete('/verificationComments/:comment_id', (req, res) => {
    const { comment_id } = req.params;
    const { username } = req.body; // username ของผู้ที่พยายามลบ

    if (!comment_id || !username) {
        return res.status(400).json({ success: false, message: "Comment ID and username are required." });
    }

    // ค้นหาคอมเมนต์ก่อนเพื่อตรวจสอบว่าเป็นของใคร
    const findQuery = `SELECT comment_by FROM comment_veritraceability WHERE comment_id = ?`;

    db.query(findQuery, [comment_id], (err, results) => {
        if (err) {
            console.error("❌ Error finding comment:", err);
            return res.status(500).json({ success: false, message: "Database error finding comment." });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Comment not found." });
        }

        const commentOwner = results[0].comment_by;

        if (commentOwner !== username) {
            return res.status(403).json({ success: false, message: "You can only delete your own comments." });
        }

        // ถ้าตรงกันให้ลบ
        const deleteQuery = `DELETE FROM comment_veritraceability WHERE comment_id = ?`;
        db.query(deleteQuery, [comment_id], (err, result) => {
            if (err) {
                console.error("❌ Error deleting comment:", err);
                return res.status(500).json({ success: false, message: "Database error deleting comment." });
            }

            if (result.affectedRows === 1) {
                res.json({ success: true, message: "Comment deleted successfully." });
            } else {
                res.status(500).json({ success: false, message: "Failed to delete comment." });
            }
        });
    });
});

app.get('/project/:projectId', (req, res) => {
    // ดึงค่า projectId จาก path parameters ของ request
    const projectId = req.params.projectId;

    // ตรวจสอบว่ามี projectId ส่งมาหรือไม่ (เบื้องต้น)
    if (!projectId) {
        return res.status(400).send('Project ID is required');
    }

    // สร้าง SQL query เพื่อดึงข้อมูลเฉพาะโปรเจกต์ที่ต้องการ
    // *** สำคัญ: ตรวจสอบชื่อคอลัมน์ project_id และ project_name ให้ตรงกับในฐานข้อมูลของคุณ ***
    const sqlQuery = "SELECT project_id, project_name FROM project WHERE project_id = ?";

    // สั่ง query ไปยัง database พร้อมส่ง projectId เป็น parameter (ป้องกัน SQL Injection)
    db.query(sqlQuery, [projectId], (err, result) => {
        if (err) {
            // ถ้าเกิดข้อผิดพลาดในการ query
            console.error("Database error fetching project by ID:", err);
            res.status(500).send('Error fetching project details');
        } else {
            // ตรวจสอบว่าเจอข้อมูลหรือไม่
            if (result.length > 0) {
                // ถ้าเจอ ส่งข้อมูลโปรเจกต์ (อันแรกที่เจอ) กลับไป
                // result เป็น array, เราต้องการ object แรก
                res.send(result[0]);
            } else {
                // ถ้าไม่เจอโปรเจกต์สำหรับ ID นี้
                res.status(404).send(`Project not found with ID: ${projectId}`);
            }
        }
    });
});

// ------------------------- SERVER LISTENER -------------------------
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});