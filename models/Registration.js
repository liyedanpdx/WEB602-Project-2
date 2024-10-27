const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const bcrypt = require('bcrypt');

const registrationSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
    unique: true,
    required: true
  },
  email: {
    type: String,
    trim: true,
    unique: true,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  like_list:{
    type: Array
  }
  // Note: We don't need to explicitly define the password field
});

// Configure passport-local-mongoose
registrationSchema.plugin(passportLocalMongoose, {
  // Specify the field name for storing the hashed password
  hashField: 'password',

  // Custom password validator
  passwordValidator: (password, cb) => {
    if (password.length < 8) {
      return cb('Password must be at least 8 characters long');
    }
    // You can add more password complexity checks here
    return cb();
  },

  // Use bcrypt to encrypt the password
  encryptPassword: function(password, cb) {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return cb(err);
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) return cb(err);
        return cb(null, hash);
      });
    });
  },

  // Use bcrypt to verify the password
  comparePassword: function(candidatePassword, hashedPassword, cb) {
    bcrypt.compare(candidatePassword, hashedPassword, (err, isMatch) => {
      if (err) return cb(err);
      return cb(null, isMatch);
    });
  }
});

module.exports = mongoose.model('Registration', registrationSchema);