const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const router = express.Router();

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Helper function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Helper function to verify passwords
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('=== REGISTER REQUEST START ==='); // Enhanced logging
    console.log('Request body:', req.body); // Log the full request body
    console.log('Request headers:', req.headers); // Log headers
    console.log('Registration attempt for email:', req.body.email); // Log registration attempt

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Registration failed: Missing email or password');
      console.log('=== REGISTER REQUEST END ===');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Registration failed: Invalid email format', email);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Password strength validation
    if (password.length < 6) {
      console.log('Registration failed: Password too short', password.length);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const db = getDB();

    // Check if user already exists
    let existingUser;
    try {
      existingUser = await new Promise((resolve, reject) => {
        db.get('SELECT id, email FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            console.error('Database error checking existing user:', err);
            reject(err);
          } else {
            console.log('Existing user check result:', row);
            resolve(row);
          }
        });
      });
    } catch (dbError) {
      console.error('Database error during user existence check:', dbError);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }

    if (existingUser) {
      console.log('Registration failed: User already exists', email);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash the password
    let passwordHash;
    try {
      passwordHash = await hashPassword(password);
      console.log('Password successfully hashed');
    } catch (hashError) {
      console.error('Password hashing error:', hashError);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Error processing password'
      });
    }

    // Insert new user into database
    let result;
    try {
      result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, password_hash) VALUES (?, ?)',
          [email, passwordHash],
          function(err) {
            if (err) {
              console.error('Database insert error:', err);
              reject(err);
            } else {
              console.log('User inserted with lastID:', this.lastID);
              resolve(this);
            }
          }
        );
      });
    } catch (insertError) {
      console.error('Database insertion error:', insertError);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Error saving user to database'
      });
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: result.lastID, email: email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('JWT token created successfully');
    } catch (tokenError) {
      console.error('Token creation error:', tokenError);
      console.log('=== REGISTER REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Error creating authentication token'
      });
    }

    console.log('Registration successful for user ID:', result.lastID);
    console.log('Response being sent:', {
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.lastID,
        email: email
      }
    });
    console.log('=== REGISTER REQUEST END ===');
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: token,
      user: {
        id: result.lastID,
        email: email
      }
    });

  } catch (error) {
    console.error('Unexpected registration error:', error);
    console.log('=== REGISTER REQUEST END ===');
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('=== LOGIN REQUEST START ==='); // Enhanced logging
    console.log('Request body:', req.body); // Log the full request body
    console.log('Request headers:', req.headers); // Log headers
    console.log('Login attempt for email:', req.body.email); // Log login attempt

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      console.log('=== LOGIN REQUEST END ===');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const db = getDB();

    // Find user by email
    let user;
    try {
      user = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, email, password_hash FROM users WHERE email = ?',
          [email],
          (err, row) => {
            if (err) {
              console.error('Database error finding user:', err);
              reject(err);
            } else {
              console.log('User lookup result:', row);
              resolve(row);
            }
          }
        );
      });
    } catch (dbError) {
      console.error('Database error during user lookup:', dbError);
      console.log('=== LOGIN REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }

    if (!user) {
      console.log('Login failed: User not found', email);
      console.log('=== LOGIN REQUEST END ===');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    let isValidPassword;
    try {
      isValidPassword = await verifyPassword(password, user.password_hash);
      console.log('Password verification result:', isValidPassword);
    } catch (verifyError) {
      console.error('Password verification error:', verifyError);
      console.log('=== LOGIN REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Error verifying password'
      });
    }

    if (!isValidPassword) {
      console.log('Login failed: Invalid password for user', email);
      console.log('=== LOGIN REQUEST END ===');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Create JWT token
    let token;
    try {
      token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('JWT token created successfully');
    } catch (tokenError) {
      console.error('Token creation error:', tokenError);
      console.log('=== LOGIN REQUEST END ===');
      return res.status(500).json({
        success: false,
        message: 'Error creating authentication token'
      });
    }

    console.log('Login successful for user ID:', user.id);
    console.log('Response being sent:', {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email
      }
    });
    console.log('=== LOGIN REQUEST END ===');
    
    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Unexpected login error:', error);
    console.log('=== LOGIN REQUEST END ===');
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;