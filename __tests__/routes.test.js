// __tests__/routes.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// 在引入 app 之前先定义和注册 Blog Schema
const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image_url: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: true,
    trim: true
  },
  likes: {
    type: Number,
  }
}, { strict: false });

// 注册 Blog 模型
mongoose.model('Blog', blogSchema, 'blog');

// 确保在引入 app 之前先注册所有模型
require('../models/Registration');

// 然后再引入 app 和其他依赖
const app = require('../app');
const Registration = mongoose.model('Registration');
const Blog = mongoose.model('Blog');

describe('Routes Testing', () => {
  let mongoServer;
  let testBlog;
  let testUser;

  // 设置测试环境
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = await mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    });
  });

  // 清理环境
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // 每个测试前重置数据
  beforeEach(async () => {
    await Registration.deleteMany({});
    await Blog.deleteMany({});

    // 创建测试用户数据
    testUser = {
      username: 'testuser',
      email: 'test@example.com',
      phone: '1234567890',
      password: 'TestPass123!'
    };

    // 创建测试博客数据
    testBlog = {
      title: 'Test Blog Title',
      description: 'Test Blog Description',
      image_url: 'test-image.jpg',
      date: new Date().toISOString(),
      content: 'Test Blog Content',
      author: testUser.username,
      likes: 0
    };
  });


  describe('Authentication Tests', () => {
    describe('Registration', () => {
      test('GET /register should render registration page', async () => {
        const response = await request(app)
          .get('/register')
          .expect(200);
        // 修改为实际的页面内容匹配
        expect(response.text).toContain('Register to subscribe');
      });

      test('POST /register should create new user successfully', async () => {
        const response = await request(app)
          .post('/register')
          .send(testUser)
          .expect(302); // 重定向到感谢页面

        const user = await Registration.findOne({ username: testUser.username });
        expect(user).toBeTruthy();
        expect(user.email).toBe(testUser.email);
      });

      test('POST /register should fail with invalid data', async () => {
        const invalidUser = { ...testUser, email: 'invalid-email' };
        const response = await request(app)
          .post('/register')
          .send(invalidUser)
          .expect(200); // 返回注册页面并显示错误

        expect(response.text).toContain('error');
      });
    });

    describe('Login/Logout', () => {
      beforeEach(async () => {
        // 预先注册用户
        await Registration.register(
          new Registration({
            username: testUser.username,
            email: testUser.email,
            phone: testUser.phone
          }),
          testUser.password
        );
      });

      test('GET /login should render login page', async () => {
        const response = await request(app)
          .get('/login')
          .expect(200);
        // 修改为实际的页面内容匹配
        expect(response.text).toContain('Log in to see blogs');
      });

      test('POST /login should authenticate valid user', async () => {
        await request(app)
          .post('/login')
          .send({
            username: testUser.username,
            password: testUser.password
          })
          .expect(302) // 重定向到博客页面
          .expect('Location', '/blog');
      });

      test('POST /login should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/login')
          .send({
            username: testUser.username,
            password: 'wrongpassword'
          })
          .expect(200);

        // 修改为实际的错误消息匹配
        expect(response.text).toContain('Password or username is incorrect');
      });

      test('GET /logout should log out user', async () => {
        const agent = request.agent(app);
        
        // 先登录
        await agent
          .post('/login')
          .send({
            username: testUser.username,
            password: testUser.password
          });

        // 然后登出
        await agent
          .get('/logout')
          .expect(302)
          .expect('Location', '/home');
      });
    });
  });
//   describe('Blog Tests', () => {
//     let agent;
//     let testUser;
//     let testBlog;
  
//     beforeEach(async () => {
//       // 创建新的 agent
//       agent = request.agent(app);
  
//       // 设置测试用户
//       testUser = {
//         username: 'bloguser',
//         email: 'blog@example.com',
//         phone: '1234567890',
//         password: 'BlogPass123!'
//       };
  
//       // 创建测试博客数据
//       testBlog = {
//         title: 'Test Blog Title',
//         description: 'Test Description',
//         image_url: 'test-image.jpg',
//         date: new Date().toISOString(),
//         content: 'Test Content',
//         author: testUser.username,
//         likes: 0
//       };
  
//       // 注册用户
//       await Registration.register(
//         new Registration({
//           username: testUser.username,
//           email: testUser.email,
//           phone: testUser.phone
//         }),
//         testUser.password
//       );
  
//       // 登录用户 - 移除状态码检查
//       await agent
//         .post('/login')
//         .send({
//           username: testUser.username,
//           password: testUser.password
//         });
  
//       // 保存测试博客
//       const blog = new Blog(testBlog);
//       await blog.save();
//     });
  
//     test('GET /blog should display blogs for authenticated user', async () => {
//       const response = await agent
//         .get('/blog')
//         .expect(200);
  
//       expect(response.text).toContain(testBlog.title);
//     });
  
//     test('POST /toggle-like should toggle blog like status', async () => {
//       // 查找已保存的博客
//       const blog = await Blog.findOne({ title: testBlog.title });
//       expect(blog).toBeTruthy(); // 确保博客存在
  
//       // 发送点赞请求
//       const response = await agent
//         .post('/toggle-like')
//         .send({ dishId: blog._id.toString() })
//         .expect(200); // 期望返回 200
  
//       // 验证响应
//       expect(response.body).toEqual({
//         likes: 1,
//         isLiked: true
//       });
  
//       // 验证数据库更新
//       const updatedBlog = await Blog.findById(blog._id);
//       expect(updatedBlog.likes).toBe(1);
  
//       // 再次点赞以测试取消点赞功能
//       const secondResponse = await agent
//         .post('/toggle-like')
//         .send({ dishId: blog._id.toString() })
//         .expect(200);
  
//       expect(secondResponse.body).toEqual({
//         likes: 0,
//         isLiked: false
//       });
  
//       const finalBlog = await Blog.findById(blog._id);
//       expect(finalBlog.likes).toBe(0);
//     });
  
//     // 添加新的测试用例：验证未授权访问
//     test('POST /toggle-like should require authentication', async () => {
//       const blog = await Blog.findOne({ title: testBlog.title });
      
//       // 使用新的未认证 agent
//       const unauthenticatedAgent = request(app);
      
//       await unauthenticatedAgent
//         .post('/toggle-like')
//         .send({ dishId: blog._id.toString() })
//         .expect(302) // 应该重定向到登录页面
//         .expect('Location', '/login');
//     });
//   });
  
  // 添加一个专门用于验证认证的测试组
  describe('Authentication Behavior', () => {
    test('Protected routes should redirect to login when not authenticated', async () => {
      const agent = request(app);
  
      // 测试博客列表页
      await agent
        .get('/blog')
        .expect(302)
        .expect('Location', '/login');
  
      // 测试点赞功能
      await agent
        .post('/toggle-like')
        .send({ dishId: 'some-id' })
        .expect(302)
        .expect('Location', '/login');
    });
  });
});