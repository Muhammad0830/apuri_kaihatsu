import {IController} from '../utils/icontroller';
import {ExtendedRequest, verifyToken} from '../middlewares/auth'
import express, {Response, Router} from "express";
import DB from '../utils/db-client'
import {
    isValidString,
    isValidArrayId,
    isValidPriority, isValidId
} from '../utils/validate'
import process from "node:process";
import {generatePaginationLinks} from "../utils/helper";

class StudentController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.post('/post/create', verifyToken, this.createPost)
        this.router.get('/post/list', verifyToken, this.postList)
        // this.router.get('/post/create/title', verifyToken, this.postCreateTitle)

        this.router.get('/post/:id', verifyToken, this.postView)
        this.router.put('/post/:id', verifyToken, this.postUpdate)
        this.router.delete('/post/:id', verifyToken, this.postDelete)

        this.router.get('/post/:id/students', verifyToken, this.postViewStudents)
        this.router.get('/post/:id/student/:student_id', verifyToken, this.postStudentParent)

        this.router.get('/post/:id/groups', verifyToken, this.postViewGroups)
        this.router.get('/post/:id/group/:group_id', verifyToken, this.postGroupStudents)
        this.router.get('/post/:id/group/:group_id/student/:student_id', verifyToken, this.postGroupStudentParent)

        this.router.post('/post/:id/groups/:group_id', verifyToken, this.groupRetryPush)
        this.router.post('/post/:id/students/:student_id', verifyToken, this.studentRetryPush)
        this.router.post('/post/:id/parents/:parent_id', verifyToken, this.parentRetryPush)

    }

    // postCreateTitle(req: Request, res: Response): void {
    //     res.send('Hello World'); // Sends "Hello World" as the response
    // }
    

    groupRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const groupId = req.params.group_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }


            const postInfo = await DB.query(`SELECT po.id, ps.group_id
                FROM PostStudent AS ps
                INNER JOIN Post AS po ON
                    po.id = ps.post_id
                WHERE ps.post_id = :post_id
                    AND ps.group_id = :group_id
                    AND po.school_id = :school_id`, {
                post_id: postId,
                group_id: groupId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                SET push = 0
                WHERE post_student_id IN (
                    SELECT id
                    FROM PostStudent
                    WHERE post_id = :post_id AND group_id = :group_id
                ) AND viewed_at IS NULL`, {
                post_id: post.id,
                group_id: post.group_id,
            })

            return res.status(200).json({
                message: 'Post Notification replayed successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    studentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const student_id = req.params.student_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }
            if (!student_id || !isValidId(student_id)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing student id'
                }
            }


            const postInfo = await DB.query(`SELECT po.id, ps.student_id
                    FROM PostStudent AS ps
                    INNER JOIN Post AS po ON
                        po.id = ps.post_id
                    WHERE ps.post_id = :post_id
                        AND ps.student_id = :student_id
                        AND po.school_id = :school_id`, {
                post_id: postId,
                student_id: student_id,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                SET push = 0
                WHERE post_student_id IN (
                    SELECT id
                    FROM PostStudent
                    WHERE post_id = :post_id AND student_id = :student_id
                ) AND viewed_at IS NULL`, {
                post_id: post.id,
                student_id: post.student_id,
            })

            return res.status(200).json({
                message: 'Post Notification replayed successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    parentRetryPush = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            const parent_id = req.params.parent_id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }
            if (!parent_id || !isValidId(parent_id)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing parent id'
                }
            }


            const postInfo = await DB.query(`SELECT 
                    pp.parent_id, po.id
                FROM PostStudent AS ps
                INNER JOIN Post AS po ON
                    po.id = ps.post_id
                INNER JOIN PostParent AS pp ON
                    ps.id = pp.post_student_id
                WHERE ps.post_id = :post_id
                    AND po.school_id = :school_id
                    AND pp.parent_id = :parent_id`, {
                post_id: postId,
                parent_id: parent_id,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE PostParent
                SET push = 0
                WHERE post_student_id IN (
                    SELECT id
                    FROM PostStudent
                    WHERE post_id = :post_id
                ) AND parent_id = parent_id AND viewed_at IS NULL`, {
                post_id: post.id,
                parent_id: post.parent_id,
            })

            return res.status(200).json({
                message: 'Post Notification replayed successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postDelete = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }
            const postInfo = await DB.query(`SELECT 
                    id, title, description, priority FROM Post
                    WHERE school_id = :school_id AND id = :id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            await DB.execute('DELETE FROM Post WHERE id = :id;', {
                id: postId,
            })

            return res.status(200).json({
                message: 'Post deleted successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postUpdate = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }


            const {
                title,
                description,
                priority,
            } = req.body

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing title'
                }
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing description'
                }
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing priority'
                }
            }

            const postInfo = await DB.query(`SELECT 
                    id, title, description, priority FROM Post
                    WHERE school_id = :school_id AND id = :id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0]

            await DB.execute(`UPDATE Post SET
                title = :title, description = :description,
                priority = :priority, edited_at = NOW()
            WHERE id = :id AND school_id = :school_id`, {
                id: post.id,
                school_id: req.user.school_id,
                title: title,
                description: description,
                priority: priority,
            });

            await DB.execute(`UPDATE PostParent
                SET push = 0
                WHERE post_student_id IN (
                    SELECT id
                    FROM PostStudent
                    WHERE post_id = :post_id
                )`, {
                post_id: post.id
            })

            return res.status(200).json({
                message: 'Post edited successfully'
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postGroupStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }

            const groupId = req.params.group_id
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }

            const studentId = req.params.student_id
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing student id'
                }

            }

            const studentAndGroupInfo = await DB.query(`SELECT
                    st.id, st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name,
                    st.student_number,
                    ps.id AS post_student_id,
                    sg.id AS group_id,sg.name AS group_name
                FROM PostStudent AS ps
                INNER JOIN Student AS st ON ps.student_id = st.id
                INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                WHERE ps.student_id = :student_id
                AND ps.post_id = :post_id
                AND st.school_id = :school_id
                AND ps.group_id = :group_id`, {
                student_id: studentId,
                post_id: postId,
                school_id: req.user.school_id,
                group_id: groupId
            });

            if (studentAndGroupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const student = {
                id: studentAndGroupInfo[0].id,
                email: studentAndGroupInfo[0].email,
                phone_number: studentAndGroupInfo[0].phone_number,
                given_name: studentAndGroupInfo[0].given_name,
                family_name: studentAndGroupInfo[0].family_name,
                student_number: studentAndGroupInfo[0].student_number,
            }
            const group = {
                id: studentAndGroupInfo[0].group_id,
                name: studentAndGroupInfo[0].group_name,
            }

            const postStudentId = studentAndGroupInfo[0].post_student_id

            const parentsPost = await DB.query(`SELECT
                    pa.id, pa.email, pa.phone_number,
                    pa.given_name, pa.family_name,
                    ps.viewed_at
                FROM PostParent AS ps
                INNER JOIN Parent AS pa
                    ON ps.parent_id = pa.id
                WHERE ps.post_student_id = :post_student_id`, {
                post_student_id: postStudentId
            });


            return res.status(200).json({
                group: group,
                student: student,
                parents: parentsPost,
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postGroupStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }

            const groupId = req.params.group_id
            if (!groupId || !isValidId(groupId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing group id'
                }
            }

            const groupInfo = await DB.query(`
                SELECT
                    sg.id,
                    sg.name,
                    ps.post_id
                FROM PostStudent AS ps
                INNER JOIN StudentGroup AS sg
                    on ps.group_id = sg.id
                WHERE ps.group_id = :group_id
                AND ps.post_id = :post_id
                AND sg.school_id = :school_id;`, {
                group_id: groupId,
                post_id: postId,
                school_id: req.user.school_id
            });

            if (groupInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const group = groupInfo[0];


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const email = req.query.email as string || '';
            const student_number = req.query.student_number as string || '';

            const filters = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: group.post_id,
                group_id: group.id,
            };


            if (email) {
                filters.push('st.email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('st.student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(`SELECT
                    st.id, st.email, st.given_name, st.family_name,
                    st.phone_number, st.student_number, ps.id AS post_student_id
                FROM PostStudent AS ps
                INNER JOIN Student AS st on ps.student_id = st.id
                WHERE ps.post_id = :post_id 
                AND ps.group_id = :group_id 
                AND st.school_id = :school_id ${whereClause}
                LIMIT :limit OFFSET :offset`, params);

            const totalStudents = (await DB.query(`SELECT COUNT(DISTINCT st.id) AS total
                FROM PostStudent AS ps
                INNER JOIN Student AS st ON ps.student_id = st.id
                WHERE ps.post_id = :post_id 
                AND st.school_id = :school_id 
                AND ps.group_id = :group_id ${whereClause};`, params))[0].total
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const postStudentIds = studentPostList.map((student: any) => student.post_student_id);
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(`SELECT
                    pa.id,
                    pa.given_name, pa.family_name,
                    pp.viewed_at, pp.post_student_id
                FROM PostParent AS pp
                INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                WHERE pp.post_student_id IN (:student_ids);`, {
                    student_ids: postStudentIds
                });
            } else {
                readStatuses = []
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map((student: any) => ({
                ...student,
                parents: readStatusMap.get(student.post_student_id) || []
            }));


            return res.status(200).json({
                group: {
                    id: group.id,
                    name: group.name
                },
                students: studentsWithReadStatus,
                pagination: pagination
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postStudentParent = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }

            const studentId = req.params.student_id
            if (!studentId || !isValidId(studentId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing student id'
                }
            }

            const studentInfo = await DB.query(`SELECT
                    st.id, st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name,
                    st.student_number,
                    ps.id AS post_student_id
                FROM PostStudent AS ps
                INNER JOIN Student AS st on ps.student_id = st.id
                WHERE ps.student_id = :student_id
                  AND ps.post_id = :post_id
                  AND st.school_id = :school_id`, {
                student_id: studentId,
                post_id: postId,
                school_id: req.user.school_id
            });

            if (studentInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const student = studentInfo[0];
            const postStudentId = student.post_student_id

            const parentsPost = await DB.query(`SELECT
                    pa.id, pa.email, pa.phone_number,
                    pa.given_name, pa.family_name,
                    ps.viewed_at
                FROM PostParent AS ps
                INNER JOIN Parent AS pa
                    ON ps.parent_id = pa.id
                WHERE ps.post_student_id = :post_student_id`, {
                post_student_id: postStudentId
            });


            return res.status(200).json({
                student: {
                    id: student.id,
                    email: student.email,
                    phone_number: student.phone_number,
                    given_name: student.given_name,
                    family_name: student.family_name,
                    student_number: student.student_number
                },
                parents: parentsPost
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postViewGroups = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }

            const postInfo = await DB.query(`SELECT * FROM Post
                WHERE id = :id AND school_id = :school_id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0];


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const name = req.query.name as string || '';

            const filters = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id
            };


            if (name) {
                filters.push('sg.name LIKE :name');
                params.name = `%${name}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const groupsPostList = await DB.query(`SELECT
                    sg.id, sg.name,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN CONCAT(pp.parent_id, '-', ps.student_id) END) AS viewed_count,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN CONCAT(pp.parent_id, '-', ps.student_id) END) AS not_viewed_count
                FROM PostStudent AS ps
                INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                WHERE ps.post_id = :post_id AND ps.group_id IS NOT NULL AND sg.school_id = :school_id ${whereClause}
                GROUP BY sg.id, sg.name
                LIMIT :limit OFFSET :offset;`, params);

            const totalGroups = (await DB.query(`SELECT COUNT(DISTINCT sg.id) AS total
                FROM PostStudent AS ps
                INNER JOIN StudentGroup AS sg ON ps.group_id = sg.id
                WHERE ps.post_id = :post_id AND ps.group_id IS NOT NULL AND sg.school_id = :school_id ${whereClause};`,
                params))[0].total
            const totalPages = Math.ceil(totalGroups / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_groups: totalGroups,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };


            return res.status(200).json({
                groups: groupsPostList,
                pagination: pagination
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postViewStudents = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;
            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }

            const postInfo = await DB.query(`SELECT * FROM Post
                WHERE id = :id AND school_id = :school_id`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0];


            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');

            const offset = (page - 1) * limit;

            const email = req.query.email as string || '';
            const student_number = req.query.student_number as string || '';

            const filters = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset,
                post_id: post.id
            };


            if (email) {
                filters.push('email LIKE :email');
                params.email = `%${email}%`;
            }
            if (student_number) {
                filters.push('student_number LIKE :student_number');
                params.student_number = `%${student_number}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const studentPostList = await DB.query(`SELECT
                    st.id, st.email, st.given_name, st.family_name,
                    st.phone_number, st.student_number, ps.id AS post_student_id
                FROM PostStudent AS ps
                INNER JOIN Student AS st on ps.student_id = st.id
                WHERE ps.post_id = :post_id AND ps.group_id IS NULL ${whereClause}
                LIMIT :limit OFFSET :offset`, params);

            const totalStudents = (await DB.query(`SELECT COUNT(DISTINCT st.id) AS total
                FROM PostStudent AS ps
                INNER JOIN Student AS st ON ps.student_id = st.id
                WHERE ps.post_id = :post_id ${whereClause};`, params))[0].total
            const totalPages = Math.ceil(totalStudents / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_students: totalStudents,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const postStudentIds = studentPostList.map((student: any) => student.post_student_id);
            let readStatuses;
            if (postStudentIds.length) {
                readStatuses = await DB.query(`SELECT
                    pa.id,
                    pa.given_name, pa.family_name,
                    pp.viewed_at, pp.post_student_id
                FROM PostParent AS pp
                INNER JOIN Parent AS pa ON pp.parent_id = pa.id
                WHERE pp.post_student_id IN (:student_ids);`, {
                    student_ids: postStudentIds
                });
            } else {
                readStatuses = []
            }

            const readStatusMap = new Map();
            readStatuses.forEach((parent: any) => {
                const parents = readStatusMap.get(parent.post_student_id) || [];
                parents.push({
                    id: parent.id,
                    given_name: parent.given_name,
                    family_name: parent.family_name,
                    viewed_at: parent.viewed_at ?? false
                });
                readStatusMap.set(parent.post_student_id, parents);
            });

            const studentsWithReadStatus = studentPostList.map((student: any) => ({
                ...student,
                parents: readStatusMap.get(student.post_student_id) || []
            }));


            return res.status(200).json({
                students: studentsWithReadStatus,
                pagination: pagination
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postView = async (req: ExtendedRequest, res: Response) => {
        try {
            const postId = req.params.id;

            if (!postId || !isValidId(postId)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing post id'
                }
            }
            const postInfo = await DB.query(`SELECT
                    po.id, po.title, po.description,
                    po.priority, po.sent_at, po.edited_at,
                    ad.id AS admin_id, ad.given_name, ad.family_name,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN pp.parent_id END) AS read_count,
                    COUNT(DISTINCT CASE WHEN pp.viewed_at IS NULL THEN pp.parent_id END) AS unread_count
                FROM Post AS po
                INNER JOIN Admin AS ad ON po.admin_id = ad.id
                LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                WHERE po.id = :id AND po.school_id = :school_id
                GROUP BY po.id, ad.id, ad.given_name, ad.family_name`, {
                id: postId,
                school_id: req.user.school_id
            });

            if (postInfo.length <= 0) {
                throw {
                    status: 404,
                    message: 'Post not found'
                }
            }

            const post = postInfo[0];

            return res.status(200).json({
                post: {
                    id: post.id,
                    title: post.title,
                    description: post.description,
                    priority: post.priority,
                    sent_at: post.sent_at,
                    edited_at: post.edited_at,
                    read_count: post.read_count,
                    unread_count: post.unread_count
                },
                admin: {
                    id: post.admin_id,
                    given_name: post.given_name,
                    family_name: post.family_name,
                },
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    postList = async (req: ExtendedRequest, res: Response) => {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(process.env.PER_PAGE + '');
            const offset = (page - 1) * limit;

            const priority = req.query.priority as string || '';
            const text = req.query.text as string || '';

            const filters = [];
            const params: any = {
                school_id: req.user.school_id,
                limit: limit,
                offset: offset
            };


            if (priority && isValidPriority(priority)) {
                filters.push('po.priority = :priority');
                params.priority = priority;
            }
            if (text) {
                filters.push('(po.title LIKE :text OR po.description LIKE :text)');
                params.text = `%${text}%`;
            }

            const whereClause = filters.length > 0 ? ' AND ' + filters.join(' AND ') : '';

            const postList = await DB.query(`SELECT
                    po.id, po.title, po.description, po.priority,
                    ad.id AS admin_id, ad.given_name AS admin_given_name, 
                    ad.family_name AS admin_family_name,
                    po.sent_at, po.edited_at,
                    COALESCE(ROUND((COUNT(DISTINCT CASE WHEN pp.viewed_at IS NOT NULL THEN ps.student_id END) / COUNT(DISTINCT ps.student_id)) * 100, 2), 0) AS read_percent
                FROM Post AS po
                INNER JOIN Admin AS ad ON ad.id = po.admin_id
                LEFT JOIN PostStudent AS ps ON ps.post_id = po.id
                LEFT JOIN PostParent AS pp ON pp.post_student_id = ps.id
                WHERE po.school_id = :school_id ${whereClause}
                GROUP BY po.id, po.title, po.description, po.priority, ad.given_name, ad.family_name, po.sent_at, po.edited_at
                ORDER BY po.sent_at DESC
                LIMIT :limit OFFSET :offset;`, params);


            const totalPosts = (await DB.query(`SELECT COUNT(DISTINCT po.id) AS total
                FROM Post AS po
                WHERE po.school_id = :school_id ${whereClause};`, params))[0].total
            const totalPages = Math.ceil(totalPosts / limit);

            const pagination = {
                current_page: page,
                per_page: limit,
                total_pages: totalPages,
                total_posts: totalPosts,
                next_page: page < totalPages ? page + 1 : null,
                prev_page: page > 1 ? page - 1 : null,
                links: generatePaginationLinks(page, totalPages)
            };

            const formattedPostList = postList.map((post: any) => ({
                id: post.id,
                title: post.title,
                description: post.description,
                priority: post.priority,
                sent_at: post.sent_at,
                edited_at: post.edited_at,
                read_percent: post.read_percent,
                admin: {
                    id: post.admin_id,
                    given_name: post.admin_given_name,
                    family_name: post.admin_family_name
                }
            }));


            return res.status(200).json({
                posts: formattedPostList,
                pagination: pagination
            }).end()
        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }

    createPost = async (req: ExtendedRequest, res: Response) => {
        try {
            const {
                title,
                description,
                priority,
                images,
                students,
                groups,
            } = req.body

            if (!title || !isValidString(title)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing title'
                }
            }
            if (!description || !isValidString(description)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing description'
                }
            }
            if (!priority || !isValidPriority(priority)) {
                throw {
                    status: 401,
                    message: 'Invalid or missing priority'
                }
            }


            const postInsert = await DB.execute(`
            INSERT INTO Post (title, description, priority, admin_id, school_id)
            VALUE (:title, :description, :priority, :admin_id, :school_id);`, {
                title: title,
                description: description,
                priority: priority,
                admin_id: req.user.id,
                school_id: req.user.school_id,
            });

            const postId = postInsert.insertId;
            if (students && Array.isArray(students) && isValidArrayId(students) && students.length > 0) {
                const studentList = await DB.query(
                    `SELECT st.id
                         FROM Student AS st
                         WHERE st.id IN (:students)`,
                    {students}
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id) VALUE (:post_id, :student_id)`, {
                            post_id: postId,
                            student_id: student.id,
                        });

                        const studentAttachList = await DB.query(`SELECT sp.parent_id
                                FROM StudentParent AS sp
                                WHERE sp.student_id = :student_id`,
                            {
                                student_id: student.id
                            });

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList.map((student: any) => `(${post_student.insertId}, ${student.parent_id})`).join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentValues}`);
                        }
                    }
                }
            }
            if (groups && Array.isArray(groups) && isValidArrayId(groups) && groups.length > 0) {
                const studentList = await DB.query(
                    `SELECT gm.student_id,gm.group_id FROM GroupMember AS gm
                            RIGHT JOIN StudentGroup sg on gm.group_id = sg.id
                            WHERE group_id IN (:groups) AND sg.school_id = :school_id`, {
                        groups: groups,
                        school_id: req.user.school_id
                    }
                );

                if (studentList.length > 0) {
                    for (const student of studentList) {
                        const post_student = await DB.execute(`INSERT INTO PostStudent (post_id, student_id, group_id) VALUE (:post_id, :student_id, :group_id)`, {
                            post_id: postId,
                            student_id: student.student_id,
                            group_id: student.group_id
                        });

                        const studentAttachList = await DB.query(`SELECT sp.parent_id
                                FROM StudentParent AS sp
                                WHERE sp.student_id = :student_id`,
                            {
                                student_id: student.student_id
                            });

                        if (studentAttachList.length > 0) {
                            const studentValues = studentAttachList.map((student: any) => `(${post_student.insertId}, ${student.parent_id})`).join(', ');
                            await DB.execute(`INSERT INTO PostParent (post_student_id, parent_id) VALUES ${studentValues}`);
                        }
                    }
                }
            }

            return res.status(200).json({
                post: {
                    id: postId,
                    title: title,
                    description: description,
                    priority: priority,
                    images: images,
                }
            }).end();

        } catch (e: any) {
            if (e.status) {
                return res.status(e.status).json({
                    error: e.message
                }).end();
            } else {
                return res.status(500).json({
                    error: 'Internal server error'
                }).end();
            }
        }
    }
}

export default StudentController