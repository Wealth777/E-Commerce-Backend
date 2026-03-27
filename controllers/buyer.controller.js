const buyerModel = require('../models/buyer.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const{ generateSerialNumber } = require('../utils/generateSerial');

const saltRounds = 10;

exports.createUser = async (req, res) => {
    try {
        const { fullName, email, phoneNo, password } = req.body;
        
        if (!fullName || !email || !phoneNo || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        const existingUser = await buyerModel.findOne({ email });
        if (existingUser) {
            console.log('User already exist')
            return res.status(400).send('User already exist... Try to login or use another ID(email)');
        };
        
        const hashPassword = await bcrypt.hash(password, saltRounds);
        
        const serialNo = await generateSerialNumber("buyer");

        const createAcc = new buyerModel({
            serialNumber: serialNo,
            fullName,
            email,
            phoneNo,
            password: hashPassword
        });

        await createAcc.save();

        res.status(201).json({
            success: true,
            message: '🎉 User Account Created Successfully!.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error')
    };
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await buyerModel.findOne({ email }).select('+password');

        if (!user) {
            console.log('User not found');
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        };

        const confirmPassword = await bcrypt.compare(password, user.password);
        if (!confirmPassword) {
            console.log('Password not match');
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        };

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_KEY,
            { expiresIn: "1h" }
        );

        const userDetails = {
            _id: user._id,
            serialNumber: user.serialNumber,
            fullName: user.fullName,
            email: user.email,
            phoneNo: user.phoneNo
        };

        res.status(200).json({
            success: true,
            message: "🎉 User Login Successfully!.",
            token,
            data: userDetails
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    };
};

exports.getUsersDetails = async (req, res) => {
    try {
        const profile = await buyerModel
            .findById(req.userId)
            .select('serialNumber fullName email phoneNo');

       if (!profile) {
            console.log('User not found')
            return res.status(404).send('User not found')
        }

        res.status(200).json({
            success: true,
            data: profile
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error ' + err);
    };
};