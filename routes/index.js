const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const auth = require('http-auth');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Registration = mongoose.model('Registration');
const Blog = mongoose.model('Blog');

// const basic = auth.basic({
//   file: path.join(__dirname, '../users.htpasswd'),
// });

router.get('/home', isLoggedIn, (req, res) => {
  console.log('Homepage - User:', req.user); 
  console.log('Homepage - Session:', req.session);
  res.render('index', { 
    title: 'Registration form',
    user: req.user,  // 确保传递用户信息
    username: req.user ? req.user.username : null, // 添加这行
    isAuthenticated: req.isAuthenticated()  // 添加这行
  });
});
router.get('/register', (req, res) => {
  //res.send('It works!');
  res.render('register', { title: 'Registration Page' });
});

router.get('/thankyou', (req, res) => {
  res.render('thankyou', { title: 'Thank You' });
});


router.get('/blog', isLoggedIn, async (req, res) => {
  try {
    const blogPosts = await Blog.find().lean();
    let user = await Registration.findOne({ username: req.user.username }).lean();

    // If user is not found, create an empty user object with an empty like_list
    if (!user) {
      user = { like_list: [] };
      console.warn(`User ${req.user.username} not found in the database`);
    }

    const formattedPosts = blogPosts.map(({ _id, title, description, image_url, date, content, author, likes }) => ({
      _id: _id.toString(),
      title,
      description,
      image_url,
      date,
      content,
      author,
      likes: likes || 0,
      isLiked: user.like_list ? user.like_list.includes(_id.toString()) : false
    }));

    res.render('blog', { 
      title: 'Blog Posts',
      lis: formattedPosts,
      username: req.user.username
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    res.status(500).send('Error fetching blog posts');
  }
});

router.get('/blog/:id', isLoggedIn, async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id).lean();
    const user = await Registration.findOne({ username: req.user.username }).lean();

    if (!post) {
      return res.status(404).send('Blog post not found');
    }

    const formattedPost = {
      ...post,
      _id: post._id.toString(),
      likes: post.likes || 0,
      isLiked: user.like_list ? user.like_list.includes(post._id.toString()) : false
    };

    res.render('blogPost', { 
      title: post.title,
      post: formattedPost,
      username: req.user.username
    });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    res.status(500).send('Error fetching blog post');
  }
});
router.post('/toggle-like', isLoggedIn, async (req, res) => {
  try {
    const { dishId } = req.body;
    const username = req.user.username;

    const user = await Registration.findOne({ username });
    const dish = await Blog.findById(dishId);

    const isLiked = user.like_list.includes(dishId);

    if (isLiked) {
      // Remove like
      await Registration.updateOne(
        { username },
        { $pull: { like_list: dishId } }
      );
      dish.likes = (dish.likes || 1) - 1;
    } else {
      // Add like
      await Registration.updateOne(
        { username },
        { $addToSet: { like_list: dishId } }
      );
      dish.likes = (dish.likes || 0) + 1;
    }

    await dish.save();

    res.json({ likes: dish.likes, isLiked: !isLiked });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Error toggling like' });
  }
});

router.get('/registrations', isLoggedIn, (req, res) => {//basic.check((req, res) => {
  Registration.find()
    .then((registrations) => {
      res.render('registrants', { title: 'Listing registrations', registrations });
    })
    .catch(() => { 
      res.send('Sorry! Something went wrong.'); 
    });
});
// router.get('/blog', isLoggedIn, (req, res) => {//basic.check((req, res) => {
//   Registration.find()
//     .then((registrations) => {
//       res.render('registrants', { title: 'Listing registrations', registrations });
//     })
//     .catch(() => { 
//       res.send('Sorry! Something went wrong.'); 
//     });
// });

// Validation middleware
const registerValidationRules = [
  body('username')
    .isLength({ min: 5 }).withMessage('Username must be at least 5 characters long')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers'),
  body('email')
    .isEmail().withMessage('Please enter a valid email'),
  body('phone')
    .isMobilePhone().withMessage('Please enter a valid phone number'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .withMessage('Password must include one lowercase character, one uppercase character, a number, and a special character')
];

router.post('/register', 
    (req, res, next) => {
        const registerLimiter = req.app.get('registerLimiter');
        registerLimiter(req, res, next);
    },
    registerValidationRules, 
    (req, res) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
          Registration.register(new Registration({ username: req.body.username, email: req.body.email, phone: req.body.phone }), req.body.password, (err, user) => {
            if (err) {
              console.log(err);
              return res.render('register', { title: 'Registration Page', errors: [{ msg: err.message }], data: req.body });
            }
            passport.authenticate('local')(req, res, () => {
              res.redirect('/thankyou');
            });
          });
        } else {
          res.render('register', { 
            title: 'Registration Page',
            errors: errors.array(),
            data: req.body,
          });
        }
    }
);

router.get('/login', (req, res, next) => {
  const loginLimiter = req.app.get('loginLimiter');
  loginLimiter(req, res, (err) => {
    if (err) {
      // 如果触发了限流，显示错误消息
      return res.render('login', { 
        title: 'Login',
        errors: [{ msg: "Too many login attempts. Please try again later." }],
        data: {}
      });
    }
    // 如果没有触发限流，继续到下一个中间件
    next();
  });
}, (req, res) => {
  // 正常渲染登录页面
  res.render('login', { 
    title: 'Login',
    errors: [],
    data: {}
  });
});


router.post('/login', (req, res, next) => {
  const loginLimiter = req.app.get('loginLimiter');
  loginLimiter(req, res, (err) => {
    if (req.rateLimit && req.rateLimit.isLimited) {
      // 如果触发了限流，显示错误消息
      return res.render('login', { 
        title: 'Login',
        errors: [{ msg: req.rateLimit.message }],
        data: req.body
      });
    }
    // 如果没有触发限流，继续到认证中间件
    next();
  });
}, (req, res, next) => {
  passport.authenticate('local', (authErr, user, info) => {
    if (authErr) {
      return next(authErr);
    }
    if (!user) {
      // 认证失败
      return res.render('login', { 
        title: 'Login',
        errors: [{ msg: info.message || 'Invalid username or password' }],
        data: req.body
      });
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.redirect('/blog'); // 登录成功后重定向
    });
  })(req, res, next);
});
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/home');
  });
});


function isLoggedIn(req, res, next) {
  console.log('========= Auth Check =========');
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('Is authenticated:', req.isAuthenticated());
  console.log('User:', req.user);
  console.log('Cookies:', req.cookies);
  console.log('============================');
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}
module.exports = router;