import { IController } from "../utils/icontroller";
import { ExtendedRequest, verifyToken } from "../middlewares/auth";
import express, { Response, Router } from "express";
import { Parent } from "../utils/cognito-client";
import { MockCognitoClient } from "../utils/mock-cognito-client";
import DB from "../utils/db-client";
import iconv from "iconv-lite";
import {
  isValidString,
  isValidPhoneNumber,
  isValidEmail,
  isValidArrayId,
  isValidId,
  isValidStudentNumber,
} from "../utils/validate";

import process from "node:process";
import { generatePaginationLinks } from "../utils/helper";
import multer from "multer";
import { Readable } from "node:stream";
import csv from "csv-parser";
import { stringify } from "csv-stringify/sync";

const storage = multer.memoryStorage();
const upload = multer({ storage });

class ParentController implements IController {
  public router: Router = express.Router();
  public cognitoClient: any;

  constructor() {
    this.cognitoClient =
      process.env.USE_MOCK_COGNITO === "true" ? MockCognitoClient : Parent;
    this.initRoutes();
  }

  initRoutes(): void {
    this.router.post("/parent/create", verifyToken, this.createParent);
    this.router.get("/parent/list", verifyToken, this.parentList);
    this.router.get(
      "/parent/list/detailed",
      verifyToken,
      this.detailedParentList,
    );
    this.router.post("/parent/ids", verifyToken, this.parentIds);
    this.router.post(
      "/parent/upload",
      verifyToken,
      upload.single("file"),
      this.uploadParentsFromCSV,
    );
    this.router.get("/parent/export", verifyToken, this.exportParentsToCSV);

    this.router.get("/parent/:id", verifyToken, this.parentView);
    this.router.put("/parent/:id", verifyToken, this.parentEdit);
    this.router.delete("/parent/:id", verifyToken, this.parentDelete);

    this.router.get("/parent/:id/students", verifyToken, this.parentStudents);
    this.router.post(
      "/parent/:id/students",
      verifyToken,
      this.changeParentStudents,
    );
  }

  exportParentsToCSV = async (req: ExtendedRequest, res: Response) => {
    try {
      const parents = await DB.query(
        `SELECT
                id, email, phone_number, given_name, family_name
                FROM Parent
                WHERE school_id = :school_id`,
        {
          school_id: req.user.school_id,
        },
      );

      if (parents.length === 0) {
        return res
          .status(404)
          .json({
            error: "No parents found",
          })
          .end();
      }

      for (const parent of parents) {
        const studentList = await DB.query(
          `SELECT
                    st.student_number
                    FROM StudentParent AS sp
                    INNER JOIN Student AS st ON sp.student_id = st.id
                    WHERE sp.parent_id = :parent_id`,
          {
            parent_id: parent.id,
          },
        );
        parent.student_numbers = studentList
          .map((student: any) => student.student_number)
          .join(", ");
      }

      const csvData = parents.map((parent: any) => ({
        email: parent.email,
        phone_number: parent.phone_number,
        given_name: parent.given_name,
        family_name: parent.family_name,
        student_numbers: parent.student_numbers,
      }));

      const csvContent = stringify(csvData, {
        header: true,
        columns: [
          "email",
          "phone_number",
          "given_name",
          "family_name",
          "student_numbers",
        ],
      });

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="parents.csv"',
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send(Buffer.from("\uFEFF" + csvContent, "utf-8"));
    } catch (e: any) {
      return res
        .status(500)
        .json({
          error: "Internal server error",
          details: e.message,
        })
        .end();
    }
  };

  uploadParentsFromCSV = async (req: ExtendedRequest, res: Response) => {
    const { throwInError, action, withCSV } = req.body;
    const throwInErrorBool = throwInError === "true";
    const withCSVBool = withCSV === "true";

    const results: any[] = [];
    const errors: any[] = [];
    const inserted: any[] = [];
    const updated: any[] = [];
    const deleted: any[] = [];

    try {
      if (!req.file || !req.file.buffer) {
        return res
          .status(400)
          .json({
            error: "Bad Request",
            details: "File is missing or invalid",
          })
          .end();
      }

      const decodedContent = await iconv.decode(req.file.buffer, "UTF-8");

      const stream = Readable.from(decodedContent);
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on("headers", (headers: any) => {
            if (headers[0].charCodeAt(0) === 0xfeff) {
              headers[0] = headers[0].substring(1);
            }
          })
          .on("data", (data: any) => {
            if (Object.values(data).some((value: any) => value.trim() !== "")) {
              results.push(data);
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      const validResults: any[] = [];
      const existingEmailsInCSV: string[] = [];
      const existingPhoneNumbersInCSV: string[] = [];

      for (const row of results) {
        const {
          email,
          phone_number,
          given_name,
          family_name,
          student_numbers,
        } = row;
        const rowErrors: any = {};
        const normalizedEmail = String(email).trim();
        const normalizedPhoneNumber = Number(phone_number).toString();
        const normalizedGiven = String(given_name).trim();
        const normalizedFamily = String(family_name).trim();
        const normalizedStudentNumbers = String(student_numbers)
          .split(",")
          .map((item) => item.trim());

        if (!isValidEmail(normalizedEmail)) rowErrors.email = "Invalid email";
        if (!isValidPhoneNumber(normalizedPhoneNumber))
          rowErrors.phone_number = "Invalid phone number";
        if (!isValidString(normalizedGiven))
          rowErrors.given_name = "Invalid given name";
        if (!isValidString(normalizedFamily))
          rowErrors.family_name = "Invalid family name";
        for (const studentNumber of normalizedStudentNumbers) {
          if (!isValidStudentNumber(studentNumber))
            rowErrors.student_numbers = "Invalid student numbers";
        }
        if (existingEmailsInCSV.includes(normalizedEmail)) {
          rowErrors.email = "This email already exists";
        }
        if (existingPhoneNumbersInCSV.includes(normalizedPhoneNumber)) {
          rowErrors.phone_number = "This phone number already exists";
        }

        if (Object.keys(rowErrors).length > 0) {
          errors.push({ row, errors: rowErrors });
        } else {
          row.email = normalizedEmail;
          row.phone_number = normalizedPhoneNumber;
          row.given_name = normalizedGiven;
          row.family_name = normalizedFamily;
          row.student_numbers = normalizedStudentNumbers;
          existingEmailsInCSV.push(row.email);
          existingPhoneNumbersInCSV.push(row.phone_number);

          validResults.push(row);
        }
      }

      if (errors.length > 0 && throwInErrorBool) {
        return res.status(400).json({ errors: errors }).end();
      }

      const emails = validResults.map((row) => row.email);
      if (emails.length === 0) {
        return res
          .status(400)
          .json({
            errors: errors,
            message: "All data invalid",
          })
          .end();
      }
      const phoneNumbers = validResults.map((row) => row.phone_number);
      if (phoneNumbers.length === 0) {
        return res
          .status(400)
          .json({
            errors: errors,
            message: "All data invalid",
          })
          .end();
      }
      const existingParents = await DB.query(
        "SELECT email,phone_number FROM Parent WHERE email IN (:emails) OR phone_number IN (:phoneNumbers)",
        {
          emails: emails,
          phoneNumbers: phoneNumbers,
        },
      );
      const existingEmails = existingParents.map((parent: any) => parent.email);
      const existingPhoneNumbers = existingParents.map(
        (parent: any) => parent.phone_number,
      );

      if (action === "create") {
        for (const row of validResults) {
          if (existingEmails.includes(row.email)) {
            errors.push({
              row,
              errors: { email: "Parents email already exists" },
            });
          } else if (existingPhoneNumbers.includes(row.phone_number)) {
            errors.push({
              row,
              errors: { phone_number: "Parent's phone number already exists" },
            });
          } else {
            const parent = await this.cognitoClient.register(row.email);
            const parentInsert = await DB.execute(
              `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
                            VALUE (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id);`,
              {
                cognito_sub_id: parent.sub_id,
                email: row.email,
                phone_number: row.phone_number,
                given_name: row.given_name,
                family_name: row.family_name,
                school_id: req.user.school_id,
              },
            );

            const parentId = parentInsert.insertId;
            const attachedStudents: any[] = [];
            if (
              row.student_numbers &&
              Array.isArray(row.student_numbers) &&
              row.student_numbers.length > 0
            ) {
              const studentRows = await DB.query(
                `SELECT id
                                    FROM Student WHERE student_number IN (:student_numbers)
                                    GROUP BY student_number`,
                {
                  student_numbers: row.student_numbers,
                },
              );

              if (studentRows.length > 0) {
                const values = studentRows
                  .map((student: any) => `(${student.id}, ${parentId})`)
                  .join(", ");
                await DB.execute(
                  `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`,
                );

                const studentList = await DB.query(
                  `SELECT st.id,st.email,st.phone_number,st.given_name,st.family_name
                                        FROM Student as st
                                        INNER JOIN StudentParent as sp
                                        ON sp.student_id = st.id AND sp.parent_id = :parent_id`,
                  {
                    parent_id: parentId,
                  },
                );

                attachedStudents.push(...studentList);
              } else {
                errors.push({
                  row,
                  errors: { student_numbers: "Invalid student numbers" },
                });
              }
            }

            inserted.push({ ...row, students: attachedStudents });
          }
        }
      } else if (action === "update") {
        for (const row of validResults) {
          if (!existingEmails.includes(row.email)) {
            errors.push({ row, errors: { email: "Parent does not exist" } });
          } else {
            await DB.execute(
              `UPDATE Parent SET
                            phone_number = :phone_number,
                            given_name = :given_name,
                            family_name = :family_name
                        WHERE email = :email`,
              {
                email: row.email,
                phone_number: row.phone_number,
                given_name: row.given_name,
                family_name: row.family_name,
              },
            );

            const attachedStudents: any[] = [];
            if (
              row.student_numbers &&
              Array.isArray(row.student_numbers) &&
              row.student_numbers.length > 0
            ) {
              const parentId = (
                await DB.query(`SELECT id FROM Parent WHERE email = :email`, {
                  email: row.email,
                })
              )[0].id;

              const existingStudents = await DB.query(
                `SELECT st.id,student_number FROM StudentParent AS sp
                                INNER JOIN Student AS st
                                ON sp.student_id = st.id
                                WHERE sp.parent_id = :parent_id`,
                {
                  parent_id: parentId,
                },
              );
              const futureStudents = await DB.query(
                `SELECT id, student_number FROM Student WHERE student_number IN (:student_numbers)`,
                {
                  student_numbers: row.student_numbers,
                },
              );

              const deletedStudents = existingStudents.filter(
                (existing: any) =>
                  !futureStudents.some(
                    (future: any) =>
                      future.student_number === existing.student_number,
                  ),
              );
              const newStudents = futureStudents.filter(
                (future: any) =>
                  !existingStudents.some(
                    (existing: any) =>
                      existing.student_number === future.student_number,
                  ),
              );

              if (deletedStudents.length > 0) {
                for (const student of deletedStudents) {
                  await DB.execute(
                    `DELETE FROM StudentParent WHERE parent_id = :parent_id AND student_id = :student_id`,
                    {
                      parent_id: parentId,
                      student_id: student.id,
                    },
                  );
                }
              }

              if (newStudents.length > 0) {
                const values = newStudents
                  .map((student: any) => `(${student.id}, ${parentId})`)
                  .join(", ");
                await DB.execute(
                  `INSERT INTO StudentParent (student_id, parent_id) VALUES ${values}`,
                );
                // attachedStudents.push(...newStudents);
              }
            }
            updated.push({ ...row, students: attachedStudents });
          }
        }
      } else if (action === "delete") {
        for (const row of validResults) {
          if (!existingEmails.includes(row.email)) {
            errors.push({ row, errors: { email: "Parent does not exist" } });
          } else {
            await this.cognitoClient.delete(row.email);
            await DB.execute(
              "DELETE FROM Parent WHERE email = :email AND school_id = :school_id",
              {
                email: row.email,
                school_id: req.user.school_id,
              },
            );
            deleted.push(row);
          }
        }
      } else {
        return res
          .status(400)
          .json({
            error: "Bad Request",
            details: "Invalid action",
          })
          .end();
      }

      if (errors.length > 0) {
        let csvFile: Buffer | null = null;
        if (withCSVBool) {
          const csvData = errors.map((error: any) => ({
            email: error?.row?.email,
            phone_number: error?.row?.phone_number,
            given_name: error?.row?.given_name,
            family_name: error?.row?.family_name,
            student_numbers:
              error?.row?.student_numbers &&
              error?.row?.student_numbers?.join(", "),
          }));
          const csvContent = stringify(csvData, {
            header: true,
            columns: [
              "email",
              "phone_number",
              "given_name",
              "family_name",
              "student_numbers",
            ],
          });
          // response headers for sending multipart files to send it with json response
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            "attachment; filename=errors.csv",
          );

          csvFile = Buffer.from("\uFEFF" + csvContent, "utf-8");
        }

        return res
          .status(400)
          .json({
            message: "CSV processed successfully but with errors",
            inserted: inserted,
            updated: updated,
            deleted: deleted,
            errors: errors.length > 0 ? errors : null,
            csvFile: csvFile,
          })
          .end();
      }

      return res
        .status(200)
        .json({
          message: "CSV processed successfully",
          inserted: inserted,
          updated: updated,
          deleted: deleted,
        })
        .end();
    } catch (e: any) {
      return res
        .status(500)
        .json({
          error: "Internal server error",
          details: e.message,
        })
        .end();
    }
  };

  changeParentStudents = async (req: ExtendedRequest, res: Response) => {
    try {
      const parentId = req.params.id;

      if (!parentId || !isValidId(parentId)) {
        throw {
          status: 401,
          message: "Invalid or missing parent id",
        };
      }

      const parentInfo = await DB.query(
        `SELECT
                    id, email, phone_number,
                    given_name, family_name, created_at
                    FROM Parent
                    WHERE id = :id AND school_id = :school_id`,
        {
          id: parentId,
          school_id: req.user.school_id,
        },
      );

      if (parentInfo.length <= 0) {
        throw {
          status: 404,
          message: "Parent not found",
        };
      }

      const parent = parentInfo[0];

      const { students } = req.body;
      if (students.length >= 6) {
        throw {
          status: 404,
          message: "Parent can't attach more than 5 students",
        };
      }
      if (students && Array.isArray(students) && isValidArrayId(students)) {
        const existingStudents = await DB.query(
          `SELECT student_id
                    FROM StudentParent
                    WHERE parent_id = :parent_id;`,
          {
            parent_id: parent.id,
          },
        );

        const existingStudentIds = existingStudents.map(
          (student: any) => student.student_id,
        );
        const newStudentIds = students.filter(
          (id: any) => !existingStudentIds.includes(id),
        );
        const removedStudentIds = existingStudentIds.filter(
          (id: any) => !students.includes(id),
        );

        if (removedStudentIds.length > 0) {
          await DB.query(
            `DELETE FROM StudentParent
                        WHERE parent_id = :parent_id AND student_id IN (:studentIds);`,
            {
              parent_id: parent.id,
              studentIds: removedStudentIds,
            },
          );

          await DB.query(
            `DELETE pp
                        FROM PostStudent AS ps
                        INNER JOIN PostParent AS pp ON pp.post_student_id = ps.id
                        WHERE pp.parent_id = :parent_id AND ps.student_id IN (:studentIds);`,
            {
              parent_id: parent.id,
              studentIds: removedStudentIds,
            },
          );
        }

        if (newStudentIds.length > 0) {
          const insertData = newStudentIds.map((studentId: any) => ({
            student_id: studentId,
            parent_id: parent.id,
          }));
          const valuesString = insertData
            .map((item: any) => `(${item.student_id}, ${item.parent_id})`)
            .join(", ");
          await DB.query(`INSERT INTO StudentParent (student_id, parent_id)
                        VALUES ${valuesString};`);

          //     for (const parentId of limitValidate) {
          //         await DB.query(`INSERT INTO StudentParent (student_id, parent_id)
          // VALUES (:student_id, :parent_id);`, {
          //             student_id: student.id,
          //             parent_id: parentId.parent_id
          //         });
          //     }
        }

        return res
          .status(200)
          .json({
            message: "Students changed successfully",
          })
          .end();
      } else {
        throw {
          status: 401,
          message: "Invalid or missing students",
        };
      }
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentStudents = async (req: ExtendedRequest, res: Response) => {
    try {
      const parentId = req.params.id;

      if (!parentId || !isValidId(parentId)) {
        throw {
          status: 401,
          message: "Invalid or missing parent id",
        };
      }

      const parentInfo = await DB.query(
        `SELECT
                    id, email, phone_number,
                    given_name, family_name, created_at
                    FROM Parent
                    WHERE id = :id AND school_id = :school_id`,
        {
          id: parentId,
          school_id: req.user.school_id,
        },
      );

      if (parentInfo.length <= 0) {
        throw {
          status: 404,
          message: "Parent not found",
        };
      }

      const parent = parentInfo[0];

      const parentStudents = await DB.query(
        `SELECT st.id, st.given_name, st.family_name
                FROM StudentParent AS sp
                INNER JOIN Student AS st on sp.student_id = st.id
                WHERE sp.parent_id = :parent_id;`,
        {
          parent_id: parent.id,
        },
      );

      return res
        .status(200)
        .json({
          parent: parent,
          students: parentStudents,
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentIds = async (req: ExtendedRequest, res: Response) => {
    try {
      const { parentIds } = req.body;

      if (parentIds && Array.isArray(parentIds) && isValidArrayId(parentIds)) {
        const parentList = await DB.query(
          `SELECT id, given_name, family_name
                        FROM Parent WHERE id IN (:parents) AND school_id = :school_id`,
          {
            parents: parentIds,
            school_id: req.user.school_id,
          },
        );

        return res
          .status(200)
          .json({
            parents: parentList,
          })
          .end();
      } else {
        throw {
          status: 401,
          message: "Invalid id list",
        };
      }
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentDelete = async (req: ExtendedRequest, res: Response) => {
    try {
      const parentId = req.params.id;

      if (!parentId || !isValidId(parentId)) {
        throw {
          status: 401,
          message: "Invalid or missing parent id",
        };
      }
      const parentInfo = await DB.query(
        `SELECT
                id, cognito_sub_id, email,
                phone_number, given_name,
                family_name, created_at, last_login_at
                FROM Parent
                WHERE id = :id AND school_id = :school_id`,
        {
          id: parentId,
          school_id: req.user.school_id,
        },
      );

      if (parentInfo.length <= 0) {
        throw {
          status: 404,
          message: "Parent not found",
        };
      }

      const parent = parentInfo[0];

      await Parent.delete(parent.email);

      await DB.execute("DELETE FROM Parent WHERE id = :id;", {
        id: parent.id,
      });

      return res
        .status(200)
        .json({
          message: "Parent deleted successfully",
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentEdit = async (req: ExtendedRequest, res: Response) => {
    try {
      const { phone_number, given_name, family_name } = req.body;

      if (!phone_number || !isValidPhoneNumber(phone_number)) {
        throw {
          status: 401,
          message: "Invalid or missing phone number",
        };
      }
      if (!given_name || !isValidString(given_name)) {
        throw {
          status: 401,
          message: "Invalid or missing given name",
        };
      }
      if (!family_name || !isValidString(family_name)) {
        throw {
          status: 401,
          message: "Invalid or missing family name",
        };
      }

      const parentId = req.params.id;

      if (!parentId || !isValidId(parentId)) {
        throw {
          status: 401,
          message: "Invalid or missing parent id",
        };
      }
      const parentInfo = await DB.query(
        `SELECT id,
                       email, phone_number,
                       given_name, family_name,
                       created_at
                FROM Parent
                WHERE id = :id AND school_id = :school_id`,
        {
          id: parentId,
          school_id: req.user.school_id,
        },
      );

      if (parentInfo.length <= 0) {
        throw {
          status: 404,
          message: "Parent not found",
        };
      }

      const parent = parentInfo[0];

      const findDuplicates = await DB.query(
        "SELECT id, phone_number FROM Parent WHERE phone_number = :phone_number",
        {
          phone_number: phone_number,
        },
      );

      if (findDuplicates.length >= 1) {
        const duplicate = findDuplicates[0];
        if (duplicate.id != parentId) {
          if (phone_number == duplicate.phone_number) {
            throw {
              status: 401,
              message: "This phone_number already exists",
            };
          }
        }
      }

      await DB.execute(
        `UPDATE Parent SET
                        phone_number = :phone_number,
                        family_name = :family_name,
                        given_name = :given_name
                    WHERE id = :id`,
        {
          phone_number: phone_number,
          given_name: given_name,
          family_name: family_name,
          id: parent.id,
        },
      );

      return res
        .status(200)
        .json({
          parent: {
            id: parent.id,
            email: parent.email,
            phone_number: phone_number,
            given_name: given_name,
            family_name: family_name,
          },
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentView = async (req: ExtendedRequest, res: Response) => {
    try {
      const parentId = req.params.id;

      if (!parentId || !isValidId(parentId)) {
        throw {
          status: 401,
          message: "Invalid or missing parent id",
        };
      }
      const parentInfo = await DB.query(
        `SELECT id,
                       email,
                       phone_number,
                       given_name,
                       family_name,
                       created_at
                FROM Parent
                WHERE id = :id
                AND school_id = :school_id`,
        {
          id: parentId,
          school_id: req.user.school_id,
        },
      );

      if (parentInfo.length <= 0) {
        throw {
          status: 404,
          message: "Parent not found",
        };
      }

      const parent = parentInfo[0];

      const parentStudents = await DB.query(
        `SELECT
                    st.id, st.email, st.phone_number,
                    st.given_name, st.family_name, st.student_number
                FROM StudentParent AS sp
                INNER JOIN Student AS st ON sp.student_id = st.id
                WHERE sp.parent_id = :parent_id;`,
        {
          parent_id: parent.id,
        },
      );

      return res
        .status(200)
        .json({
          parent: parent,
          students: parentStudents,
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  detailedParentList = async (req: ExtendedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(process.env.PER_PAGE + "");
      const offset = (page - 1) * limit;

      const email = (req.query.email as string) || "";
      const phone_number = (req.query.phone_number as string) || "";
      const name = (req.query.name as string) || "";

      const filters = [];
      const params: any = {
        school_id: req.user.school_id,
        limit: limit,
        offset: offset,
      };

      if (email) {
        filters.push("email LIKE :email");
        params.email = `%${email}%`;
      }
      if (phone_number) {
        filters.push("phone_number LIKE :phone_number");
        params.phone_number = `%${phone_number}%`;
      }
      if (name) {
        filters.push("(given_name LIKE :name OR family_name LIKE :name)");
        params.name = `%${name}%`;
      }

      const whereClause =
        filters.length > 0 ? "AND " + filters.join(" AND ") : "";

      const parentList = await DB.query(
        `SELECT
                id, email, phone_number, given_name, family_name
                FROM Parent
                WHERE school_id = :school_id ${whereClause}
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset;`,
        params,
      );

      const totalParents = (
        await DB.query(
          `SELECT COUNT(*) as total
                FROM Parent WHERE school_id = :school_id ${whereClause};`,
          params,
        )
      )[0].total;

      const totalPages = Math.ceil(totalParents / limit);

      const pagination = {
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        total_parents: totalParents,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
        links: generatePaginationLinks(page, totalPages),
      };

      const parentIds = parentList.map((parent: any) => parent.id);
      let relationStudentList;
      if (parentIds.length) {
        relationStudentList = await DB.query(
          `SELECT
                        st.id,
                        st.given_name, st.family_name,
                        sp.parent_id AS parent_id
                    FROM StudentParent AS sp
                    INNER JOIN Student AS st ON sp.student_id = st.id
                    WHERE sp.parent_id IN (:parentIds) AND st.school_id = :school_id;`,
          {
            parentIds: parentIds,
            school_id: req.user.school_id,
          },
        );
      } else {
        relationStudentList = [];
      }

      const StudentMap = new Map();
      relationStudentList.forEach((student: any) => {
        const students = StudentMap.get(student.parent_id) || [];
        students.push({
          id: student.id,
          given_name: student.given_name,
          family_name: student.family_name,
        });
        StudentMap.set(student.parent_id, students);
      });

      const parentWithStudent = parentList.map((parent: any) => ({
        ...parent,
        students: StudentMap.get(parent.id) || [],
      }));

      return res
        .status(200)
        .json({
          parents: parentWithStudent,
          pagination: pagination,
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        console.log(e);
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  parentList = async (req: ExtendedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(process.env.PER_PAGE + "");
      const offset = (page - 1) * limit;

      const email = (req.query.email as string) || "";
      const phone_number = (req.query.phone_number as string) || "";
      const name = (req.query.name as string) || "";

      const filters = [];
      const params: any = {
        school_id: req.user.school_id,
        limit: limit,
        offset: offset,
      };

      if (email) {
        filters.push("email LIKE :email");
        params.email = `%${email}%`;
      }
      if (phone_number) {
        filters.push("phone_number LIKE :phone_number");
        params.phone_number = `%${phone_number}%`;
      }
      if (name) {
        filters.push("(given_name LIKE :name OR family_name LIKE :name)");
        params.name = `%${name}%`;
      }

      const whereClause =
        filters.length > 0 ? "AND " + filters.join(" AND ") : "";

      const parentList = await DB.query(
        `SELECT
                id, email, phone_number, given_name, family_name
                FROM Parent
                WHERE school_id = :school_id ${whereClause}
                ORDER BY id DESC
                LIMIT :limit OFFSET :offset;`,
        params,
      );

      const totalParents = (
        await DB.query(
          `SELECT COUNT(*) as total
                FROM Parent WHERE school_id = :school_id ${whereClause};`,
          params,
        )
      )[0].total;

      const totalPages = Math.ceil(totalParents / limit);

      const pagination = {
        current_page: page,
        per_page: limit,
        total_pages: totalPages,
        total_parents: totalParents,
        next_page: page < totalPages ? page + 1 : null,
        prev_page: page > 1 ? page - 1 : null,
        links: generatePaginationLinks(page, totalPages),
      };

      return res
        .status(200)
        .json({
          parents: parentList,
          pagination: pagination,
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };

  createParent = async (req: ExtendedRequest, res: Response) => {
    try {
      const { email, phone_number, given_name, family_name, students } =
        req.body;

      if (!email || !isValidEmail(email)) {
        throw {
          status: 401,
          message: "Invalid or missing email",
        };
      }
      if (!phone_number || !isValidPhoneNumber(phone_number)) {
        throw {
          status: 401,
          message: "Invalid or missing phone number",
        };
      }
      if (!given_name || !isValidString(given_name)) {
        throw {
          status: 401,
          message: "Invalid or missing given name",
        };
      }
      if (!family_name || !isValidString(family_name)) {
        throw {
          status: 401,
          message: "Invalid or missing family name",
        };
      }

      const findDuplicates = await DB.query(
        "SELECT phone_number,email FROM Parent WHERE phone_number = :phone_number OR email = :email;",
        {
          email: email,
          phone_number: phone_number,
        },
      );

      if (findDuplicates.length >= 1) {
        const duplicate = findDuplicates[0];

        if (
          email === duplicate.email &&
          phone_number == duplicate.phone_number
        ) {
          throw {
            status: 401,
            message: "This email and phone_number already exists",
          };
        }
        if (phone_number === duplicate.phone_number) {
          throw {
            status: 401,
            message: "This phone_number already exists",
          };
        } else {
          throw {
            status: 401,
            message: "This email already exists",
          };
        }
      }

      const parent = await this.cognitoClient.register(email);

      const parentInsert = await DB.execute(
        `INSERT INTO Parent(cognito_sub_id, email, phone_number, given_name, family_name, school_id)
    VALUE (:cognito_sub_id, :email, :phone_number, :given_name, :family_name, :school_id);`,
        {
          cognito_sub_id: Math.floor(Math.random() * 9999999),
          email: email,
          phone_number: phone_number,
          given_name: given_name,
          family_name: family_name,
          school_id: req.user.school_id,
        },
      );

      const parentId = parentInsert.insertId;
      const attachedStudents: any[] = [];
      if (
        students &&
        Array.isArray(students) &&
        isValidArrayId(students) &&
        students.length > 0 &&
        students.length <= 5
      ) {
        const studentAttachList = await DB.query(
          `SELECT st.id
                    FROM Student AS st
                    WHERE st.id IN (:students);`,
          {
            students: students,
          },
        );

        if (studentAttachList.length > 0) {
          const values = studentAttachList
            .map((student: any) => `(${parentId}, ${student.id})`)
            .join(", ");
          await DB.execute(
            `INSERT INTO StudentParent (parent_id, student_id) VALUES ${values}`,
          );
          const studentList = await DB.query(
            `SELECT st.id,st.email,st.phone_number,st.given_name,st.family_name,st.student_number
                            FROM Student as st
                            INNER JOIN StudentParent as sp
                            ON sp.student_id = st.id AND sp.parent_id = :parent_id`,
            {
              parent_id: parentId,
            },
          );

          attachedStudents.push(...studentList);
        }
      }

      return res
        .status(200)
        .json({
          parent: {
            id: parentId,
            email: email,
            phone_number: phone_number,
            given_name: given_name,
            family_name: family_name,
            students: attachedStudents,
          },
        })
        .end();
    } catch (e: any) {
      if (e.status) {
        return res
          .status(e.status)
          .json({
            error: e.message,
          })
          .end();
      } else {
        console.log(e);
        return res
          .status(500)
          .json({
            error: "Internal server error",
          })
          .end();
      }
    }
  };
}

export default ParentController;
