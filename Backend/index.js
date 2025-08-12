const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const CustomerModel = require('./model/CustomerModel');
const ProductModel = require('./model/MedicineModel');
const SupplierModel = require('./model/SupplierModel');
const AdminModel = require('./model/AdminModel');
const CartModel = require('./model/CartModel');
const OrderModel = require('./model/OrderModel');
const Consultation = require('./model/ConsultationModel'); // Import Consultation model
const PrescriptionModel = require('./model/PrescriptionModel');
const Contact = require('./model/Contact');
const DoctorModel = require('./model/DoctorModel');
const Bill = require('./model/BillingModel');
const PaitentModel = require('./model/Patients');
const PatientConsultationModel = require('./model/PatientConsultation');
const axios = require('axios');
require('dotenv').config();
// server.js or your Express app file
require('dotenv').config();
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const NMRAmodel = require('./model/NRMAmodel');
const fs = require('fs');
const fsp = require('fs').promises;
const XLSX = require('xlsx');
const OpenAI = require('openai');
const sharp = require('sharp');
const { 
  generateVerificationToken, 
  sendVerificationEmail, 
  sendConfirmationEmails 
} = require('./services/emailService'); 
const ConsultationModel = require('./model/ConsultationModel');
const app = express();
const visionClient = new ImageAnnotatorClient();
const saltRounds = 10;
const secretKey = process.env.SECRETKEY;
const GOOGLE_API_KEY = process.env.GOOGLE_GEOCODING_API;
const MONGODB=process.env.MONGODB;

// CORS configuration
app.use(cors({
  origin: 'https://agile-lifecare.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// Multer storage for product images (existing)
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Uploads/medicines'); // Save product images to 'Uploads/medicines'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const productFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG are allowed for product images.'), false);
  }
};

const upload = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
}).array('medicine', 1);

const uploadMedicine = multer({
  storage: productStorage,
  fileFilter: productFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
}).single('image'); // Adjusted to match /addproduct and /updateproduct routes

// Multer storage for medical records
const medicalRecordsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'Uploads/medical-records'); // Save medical records to 'Uploads/medical-records'
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const medicalRecordsFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG are allowed for medical records.'), false);
  }
};

const uploadMedicalRecords = multer({
  storage: medicalRecordsStorage,
  fileFilter: medicalRecordsFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
}).single('medicalRecords');


// Multer storage for prescriptions
const prescriptionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/prescriptions'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const prescriptionsFileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG are allowed for medical records.'), false);
  }
};

const uploadPrescriptionRecords = multer({
  storage: prescriptionStorage,
  fileFilter: prescriptionsFileFilter,
  limits: { fileSize: 1024 * 1024 * 10 } // 5MB limit
}).single('prescription');


// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'Uploads', 'list');
fsp.mkdir(uploadDir, { recursive: true })
  .catch(err => console.error('Error creating upload directory:', err));

// Multer configuration for file uploads
const liststorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const uploadList = multer({
  storage: liststorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase()
    });

    const filetypes = /xlsx|xls/;
    const mimetypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel'
    ];
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = mimetypes.includes(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      const error = new Error('Only Excel files (.xlsx, .xls) are allowed! Invalid MIME type or extension.');
      error.details = {
        mimetype: file.mimetype,
        extension: path.extname(file.originalname)
      };
      cb(error);
    }
  }
});





mongoose.connect(`${MONGODB}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("Connected to MongoDB database: lifecare"))
  .catch(err => console.error("Failed to connect to MongoDB", err));





// JWT Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token found, please try logging in again.' });
  }
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

// Signup route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const encryptedPassword = await bcrypt.hash(password, saltRounds);

    if (email.endsWith('.admin@lifecare.com')) {
      const adminUser = await AdminModel.create({
        name,
        password: encryptedPassword,
        email,
        phone,
        address,
      });
      res.status(200).json({ message: 'Admin User Created Successfully', user: adminUser });
    }
    else if(email.endsWith('.doc@gmail.com')){
      const doctor = await DoctorModel.create({
        name,
        password: encryptedPassword,
        email,
        phone,
        address,
      });
      res.status(200).json({ message: 'Customer Created Successfully', user: doctor });
    }
    else{
      const newUser = await CustomerModel.create({
        name,
        password: encryptedPassword,
        email,
        phone,
        address,
      });
      res.status(200).json({ message: 'Customer Created Successfully', user: newUser });
    }
    
  }catch (e) {
    if (e.code === 11000) {
      res.status(400).json({ error: "Email or NIC already exists." });
    } else {
      console.error("An unexpected error occurred.", e);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (email.endsWith('.admin@lifecare.com')) {
      const admin = await AdminModel.findOne({ email });
      if (!admin) {
        return res.status(404).json({ error: 'No admin Found' });
      }
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) {
        const token = jwt.sign({ email: admin.email }, secretKey, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Logged in successfully', token, user: admin });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }else if(email.endsWith('.doc@gmail.com')){
      const user = await DoctorModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'No User Found, please register.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Logged in successfully', token, user });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    } else{
      const user = await CustomerModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: 'No User Found, please register.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const token = jwt.sign({ email: user.email }, secretKey, { expiresIn: '1h' });
        return res.status(200).json({ message: 'Logged in successfully', token, user });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Get all products
app.get('/getproducts', async (req, res) => {
  try {
    const products = await ProductModel.find();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Add new product
app.post('/addproduct', uploadMedicine, async (req, res) => {
  const { medicineName, unitprice, sellingprice , otcStatus, companyName, quantity, description, manufactureDate, expiryDate } = req.body;
  if (!req.file) return res.status(400).json({ message: 'Image is required' });
  const imagePath = req.file.path;

  try {
    const supplier = await SupplierModel.findOne({ companyName });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    const medicine = new ProductModel({
      productName: medicineName,
      description,
      unitprice,
      sellingprice,
      category: otcStatus,
      quantity,
      manufactureDate,
      expiryDate,
      companyName,
      supplierID: supplier._id,
      image: imagePath
    });
    await medicine.save();
    res.status(201).json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

// Update existing product
app.put('/updateproduct/:id', uploadMedicine, async (req, res) => {
  const { id } = req.params;
  const { productName, description, sellingprice, category, quantity, companyName, manufactureDate, expiryDate } = req.body;
  try {
    const parsedManufactureDate = manufactureDate ? new Date(manufactureDate) : null;
    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    if (manufactureDate && isNaN(parsedManufactureDate?.getTime())) {
      return res.status(400).json({ message: 'Invalid manufacture date' });
    }
    if (expiryDate && isNaN(parsedExpiryDate?.getTime())) {
      return res.status(400).json({ message: 'Invalid expiry date' });
    }
    let imagePath;
    if (req.file) {
      imagePath = req.file.path;
    } else if (req.body.image) {
      imagePath = req.body.image;
    } else {
      return res.status(400).json({ message: 'No image provided' });
    }
    const supplier = await SupplierModel.findOne({ companyName });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    const updateData = {
      ...(productName && { productName }),
      ...(description && { description }),
      ...(sellingprice && { sellingprice }),
      ...(category && { category }),
      ...(imagePath && { image: imagePath }),
      ...(quantity && { quantity }),
      ...(companyName && { companyName }),
      ...(supplier && { supplierID: supplier._id }),
      ...(parsedManufactureDate && { manufactureDate: parsedManufactureDate }),
      ...(parsedExpiryDate && { expiryDate: parsedExpiryDate }),
    };
    const updatedProduct = await ProductModel.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete a product
app.delete('/deleteproduct/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ProductModel.findByIdAndDelete(id);
    res.status(204).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
});

// Get individual product
app.get('/getproduct', async (req, res) => {
  try {
    const { id } = req.query;
    const product = await ProductModel.findOne({ _id: id });
    if (!product) {
      return res.status(404).json({ error: 'No product found' });
    }
    return res.status(200).json(product);
  } catch (err) {
    console.log('Error fetching product:', err);
    return res.status(500).json({ error: 'Server side error', err });
  }
});

// Create Supplier
app.post('/addsuppliers', async (req, res) => {
  try {
    const { supplierName, companyName, email, phone } = req.body;
    const supplier = await new SupplierModel({ supplierName, companyName, email, phone }).save();
    res.status(200).json({ message: 'Supplier created successfully', supplier });
  } catch (error) {
    console.error('Error creating supplier:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Email or NIC already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Get suppliers
app.get('/getsuppliers', async (req, res) => {
  try {
    const suppliers = await SupplierModel.find();
    res.json(suppliers);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ message: 'Error fetching suppliers' });
  }
});

// Update supplier
app.put('/updatesupplier/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierName, companyName, email } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supplier ID format' });
    }
    const updatedSupplier = await SupplierModel.findByIdAndUpdate(
      id,
      { supplierName, companyName, email },
      { new: true, runValidators: true }
    );
    if (!updatedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(updatedSupplier);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
});

// Delete supplier
app.delete('/deletesupplier/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid supplier ID' });
    }
    const supplier = await SupplierModel.findByIdAndDelete(id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    return res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ message: 'Server error while deleting supplier' });
  }
});

// Get user profile
app.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    if(email.endsWith('.doc@gmail.com')){
      const currentUser = await DoctorModel.findOne({ email });
    if (!currentUser) {
      return res.status(404).json({ error: 'No Record Exists' });
    }
    return res.status(200).json({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      address: currentUser.address,
    });
    }else if(email.endsWith('.admin@lifecare.com')){
      const currentUser = await AdminModel.findOne({ email });
    if (!currentUser) {
      return res.status(404).json({ error: 'No Record Exists' });
    }
    return res.status(200).json({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      address: currentUser.address,
    });
    }else{
    const currentUser = await CustomerModel.findOne({ email });
    if (!currentUser) {
      return res.status(404).json({ error: 'No Record Exists' });
    }
    return res.status(200).json({
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      address: currentUser.address,
    });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve user data' });
  }
});

// Update profile
app.put('/updateProfile', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    const { name, phone, address } = req.body;
    const updatedUser = await CustomerModel.findOneAndUpdate(
      { email },
      { name, phone, address },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User Not Found' });
    }
    return res.status(200).json({ message: 'User Updated Successfully', updatedUser });
  } catch (error) {
    console.log('Error updating profile', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update password
app.put('/updatepassword', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    const { currentPassword, newPassword } = req.body;
    const user = await CustomerModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    const updatedUser = await CustomerModel.findOneAndUpdate(
      { email },
      { password: hashedNewPassword },
      { new: true }
    );
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error when updating the password' });
  }
});

//contact
// Contact Us Route
app.post('/api/contact', async (req, res) => {
  try {
    console.log('📨 Contact Form Data:', req.body);  // DEBUG
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: 'Message submitted successfully.' });
  } catch (err) {
    console.error('❌ Error saving contact:', err);
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Get OTC products
app.get('/getproductsOTC', async (req, res) => {
  try {
    const currentDate = new Date();
    const products = await ProductModel.find({
    category: 'OTC',
    expiryDate: { $gt: currentDate }
    });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Get profile letter and cart count
app.get('/getLetter', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    if(email.endsWith('.doc@gmail.com')){
      const user = await DoctorModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const username = user.name;
    const letter = username.charAt(0).toUpperCase();
    res.status(200).json({ letter });
    }else if(email.endsWith('.admin@lifecare.com')){
      const user = await AdminModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const username = user.name;
    const letter = username.charAt(0).toUpperCase();
    res.status(200).json({ letter });
  } else{
    const user = await CustomerModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const username = user.name;
    const letter = username.charAt(0).toUpperCase();
    const items = await CartModel.find({ email });
    const number = items.length;
    res.status(200).json({ letter, number });
  } 
}catch (error) {
    console.error('Error on the server side', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to cart
app.post('/addtocart', authenticateJWT, async (req, res) => {
  const { productId, ProductName, ProductPrice, ProductQuantity, Subtotal, Image } = req.body;
  try {
    const product = await ProductModel.findById(productId);
    if (!product) {
      console.error('No product found');
      return res.status(404).json({ message: 'No product found' });
    }
    product.quantity -= 1;
    await product.save();
    const newItem = new CartModel({
      ProductId: productId,
      ProductName,
      email: req.user.email,
      ProductPrice,
      ProductQuantity,
      Subtotal,
      Image,

    });
    await newItem.save();
    return res.status(200).json({ message: 'Product Added to Cart Successfully' });
  } catch (error) {
    console.log("Something went wrong in the server", error);
    return res.status(500).json({ error: 'Something went wrong in the server' });
  }
});

app.put('/updatecart/:id', authenticateJWT, async (req, res) => {
  try {
    const { ProductQuantity, Subtotal } = req.body;
    const cartItem = await CartModel.findById(req.params.id);
    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Optional: Validate stock availability
    const product = await ProductModel.findById(cartItem.ProductId);
    if (ProductQuantity > product.quantity) {
      return res.status(400).json({ error: 'Requested quantity exceeds available stock' });
    }

    cartItem.ProductQuantity = ProductQuantity;
    cartItem.Subtotal = Subtotal;
    await cartItem.save();
    res.json(cartItem);
  } catch (err) {
    console.error('Error updating cart:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product from cart
app.delete('/deletecartproduct/:id', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    const { id } = req.params;
    const cartItem = await CartModel.findById(id);
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    const product = await ProductModel.findById(cartItem.ProductId);
    if (product) {
      product.quantity += 1;
      await product.save();
    }
    const deletedProduct = await CartModel.findOneAndDelete({ email, _id: id });
    if (!deletedProduct) {
      return res.status(404).json({ message: 'No products found' });
    }
    res.status(200).json({ message: 'Product Deleted Successfully from the cart' });
  } catch (error) {
    console.error('Server side error when deleting the product', error);
    return res.status(500).json({ message: 'Server side error when deleting the product' });
  }
});

// Get cart items
app.get('/getcartitems', authenticateJWT, async (req, res) => {
  try {
    const email = req.user.email;
    if (!email) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    const products = await CartModel.find({ email });
    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found in the cart' });
    }
    res.status(200).json(products);
  } catch (error) {
    console.error('Server side error when fetching the cart products.', error);
    return res.status(500).json({ message: 'Server side error when fetching the cart products' });
  }
});

// Get user email
app.get('/getuser', authenticateJWT, async (req, res) => {
  try {
    return res.status(200).json({ email: req.user.email });
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Save order
app.post('/saveorder', authenticateJWT, async (req, res) => {
  const { cartItems, email, deliveryMethod, deliveryDetails, orderToken , Total } = req.body;
  if (!cartItems || !email || !deliveryMethod) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (deliveryMethod === 'home' && !deliveryDetails) {
    return res.status(400).json({ message: 'Delivery details required for home delivery' });
  }
  if (deliveryMethod === 'instore' && !orderToken) {
    return res.status(400).json({ message: 'Order token required for in-store pickup' });
  }
  try {
    const newOrder = new OrderModel({
      email,
      cartItems,
      deliveryMethod,
      deliveryDetails: deliveryMethod === 'home' ? deliveryDetails : null,
      orderToken: deliveryMethod === 'instore' ? orderToken : null,
      Total,
    });
    await newOrder.save();
    await CartModel.deleteMany({ email });
    return res.status(200).json({ message: 'Order saved successfully' });
  } catch (error) {
    console.error('Error saving order:', error.message);
    return res.status(500).json({ error: 'Failed to save order' });
  }
});

// Book consultation
// Updated book consultation route
app.post('/book-consultation', authenticateJWT, uploadMedicalRecords, async (req, res) => {
  try {
    const email = req.user.email;
    const { user, patient, location, slot } = req.body;
    
    if (!user || !patient || !location || !slot || !req.file) {
      return res.status(400).json({ message: 'All fields and medical records file are required' });
    }

    const parsedUser = JSON.parse(user);
    const parsedPatient = JSON.parse(patient);
    const parsedLocation = JSON.parse(location);
    const parsedSlot = JSON.parse(slot);

    // Validation
    if (!parsedUser.name || !parsedUser.email || !parsedUser.phone) {
      return res.status(400).json({ message: 'User details (name, email, phone) are required' });
    }
    if (!parsedPatient.name || !parsedPatient.age || !parsedPatient.gender || !parsedPatient.reason) {
      return res.status(400).json({ message: 'Patient details (name, age, gender, reason) are required' });
    }
    if (!parsedLocation.lat || !parsedLocation.lng || !parsedLocation.link) {
      return res.status(400).json({ message: 'Location details (lat, lng, link) are required' });
    }
    if (!parsedSlot.date || !parsedSlot.time) {
      return res.status(400).json({ message: 'Slot details (date, time) are required' });
    }

    // Generate verification token and expiry (24 hours from now)
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const consultation = new Consultation({
      user: {
        name: parsedUser.name,
        email: parsedUser.email,
        phone: parsedUser.phone
      },
      patient: {
        name: parsedPatient.name,
        age: parsedPatient.age,
        gender: parsedPatient.gender,
        reason: parsedPatient.reason
      },
      medicalRecords: req.file.path,
      location: {
        lat: parsedLocation.lat,
        lng: parsedLocation.lng,
        link: parsedLocation.link
      },
      slot: {
        date: new Date(parsedSlot.date),
        time: parsedSlot.time
      },
      status: 'Pending',
      verificationToken,
      verificationTokenExpires,
      verificationStatus: false
    });

    await consultation.save();

    // Send verification email
    try {
      await sendVerificationEmail(consultation);
      res.status(200).json({ 
        message: 'Consultation booked successfully! Please check your email to verify your appointment.',
        requiresVerification: true
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Still return success but mention email issue
      res.status(200).json({ 
        message: 'Consultation booked successfully, but there was an issue sending the verification email. Please contact support.',
        requiresVerification: true
      });
    }

  } catch (error) {
    console.error('Error booking consultation:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    } else if (error.message.includes('Invalid file type')) {
      return res.status(400).json({ message: error.message });
    } else if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate entry detected' });
    }
    res.status(500).json({ message: 'Failed to book consultation. Please try again.' });
  }
});

app.get('/verify-consultation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find consultation by verification token
    const consultation = await Consultation.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }, // Token not expired
      verificationStatus: false // Not already verified
    });

    if (!consultation) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification link. Please contact support if you need assistance.' 
      });
    }

    // Update consultation as verified
    consultation.verificationStatus = true;
    consultation.verifiedAt = new Date();
    consultation.status = 'Confirmed';
    // Optionally clear the token after verification
    consultation.verificationToken = undefined;
    consultation.verificationTokenExpires = undefined;

    await consultation.save();

    // Send confirmation emails to user and admin
    try {
      await sendConfirmationEmails(consultation);
    } catch (emailError) {
      console.error('Failed to send confirmation emails:', emailError);
      // Continue with verification success even if emails fail
    }

    // Redirect to a success page or return JSON based on your frontend needs
    // For API response:
    res.status(200).json({ 
      message: 'Consultation verified successfully! You will receive a confirmation email shortly.',
      verified: true,
      consultationId: consultation._id
    });

    // Or redirect to frontend success page:
    // res.redirect(`${process.env.FRONTEND_URL}/verification-success?id=${consultation._id}`);

  } catch (error) {
    console.error('Error verifying consultation:', error);
    res.status(500).json({ message: 'Failed to verify consultation. Please try again or contact support.' });
  }
});

app.get('/cancel-consultation/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find consultation by verification token
    const consultation = await Consultation.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }, // Token not expired
      verificationStatus: false // Not already verified
    });

    if (!consultation) {
      return res.status(400).json({ 
        message: 'Invalid or expired cancellation link.' 
      });
    }

    // Update consultation as cancelled
    consultation.status = 'Cancelled';
    consultation.verificationToken = undefined;
    consultation.verificationTokenExpires = undefined;

    await consultation.save();

    // For API response:
    res.status(200).json({ 
      message: 'Consultation cancelled successfully.',
      cancelled: true,
      consultationId: consultation._id
    });

    // Or redirect to frontend cancellation page:
    // res.redirect(`${process.env.FRONTEND_URL}/cancellation-success?id=${consultation._id}`);

  } catch (error) {
    console.error('Error cancelling consultation:', error);
    res.status(500).json({ message: 'Failed to cancel consultation. Please try again.' });
  }
});

// Route to get consultation status (optional - for frontend to check status)
app.get('/consultation-status/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;

    const consultation = await Consultation.findOne({
      _id: id,
      createdBy: userEmail // Ensure user can only check their own consultations
    });

    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found.' });
    }

    res.status(200).json({
      id: consultation._id,
      status: consultation.status,
      verificationStatus: consultation.verificationStatus,
      verifiedAt: consultation.verifiedAt,
      patientName: consultation.patient.name,
      appointmentDate: consultation.slot.date,
      appointmentTime: consultation.slot.time
    });

  } catch (error) {
    console.error('Error fetching consultation status:', error);
    res.status(500).json({ message: 'Failed to fetch consultation status.' });
  }
});

// Route to resend verification email (optional)
app.post('/resend-verification/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.user.email;

    const consultation = await Consultation.findOne({
      _id: id,
      createdBy: userEmail,
      verificationStatus: false // Only if not already verified
    });

    if (!consultation) {
      return res.status(404).json({ 
        message: 'Consultation not found or already verified.' 
      });
    }

    // Generate new verification token if expired
    if (consultation.verificationTokenExpires < new Date()) {
      consultation.verificationToken = generateVerificationToken();
      consultation.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await consultation.save();
    }

    // Resend verification email
    await sendVerificationEmail(consultation);

    res.status(200).json({ 
      message: 'Verification email sent successfully. Please check your email.' 
    });

  } catch (error) {
    console.error('Error resending verification email:', error);
    res.status(500).json({ 
      message: 'Failed to resend verification email. Please try again.' 
    });
  }
});

 app.post('/prescriptionUpload',authenticateJWT , uploadPrescriptionRecords, async (req , res)=>{
   try{
     const email = req.user.email;
     console.log(email);
     const {deliveryOption, tokenNumber, address, city, state, zip} = req.body;
     console.log(deliveryOption);
   if (!req.file) return res.status(400).json({ message: 'Prescription is required' });
   const prescriptionFilePath = req.file.path;
   if (deliveryOption === 'instore' && !tokenNumber) {
     return res.status(400).json({ message: 'Order token required for in-store pickup' });
   }
   const prescription = new PrescriptionModel({
     email,
     prescriptionFilePath,
     deliveryMethod:deliveryOption,
     deliveryDetails:deliveryOption==='home'? {
       address,
       city,
       state,
       zip
     }:null,
      orderToken: deliveryOption === 'instore' ? tokenNumber : null,
   });
   console.log(prescription);
   await prescription.save();
   return res.status(200).json({message:'Successfully added the prescription'});
   }catch(error){
     return res.status(500).json({message:'Server Error in uploading prescription'});
   }
 });

app.get('/api/prescriptions', async (req, res) => {
  try {
    const all = await PrescriptionModel.find().sort({ uploadedAt: -1 });
    res.status(200).json(all);
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    res.status(500).json({ message: 'Error fetching delivery details' });
  }
});

// DELETE prescription by ID
app.delete('/api/prescriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await PrescriptionModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Failed to delete prescription:', error);
    res.status(500).json({ message: 'Failed to delete delivery' });
  }
});

//location autocomplete api
app.get('/api/autocomplete', async (req, res) => {
  try {
    
    const query = req.query.input;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_API_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//to get the location from the suggestion
app.get('/api/place-details', async (req, res) => {
  try {
    const placeId = req.query.place_id;
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
        placeId
      )}&fields=geometry&key=${GOOGLE_API_KEY}`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Upload endpoint
app.post('/api/upload-nmra', authenticateJWT, uploadList.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel file
    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const medicines = XLSX.utils.sheet_to_json(sheet);
    console.log('Total records read:', medicines.length);

    // Map Excel data to schema and detect duplicates
    const formattedMedicines = medicines.map((med, index) => ({
      originalIndex: index + 2, // Excel row number (1-based, +1 for header)
      genericname: (med.genericname || med.GenericName || med.Genericname || med['Generic Name'] || '').toLowerCase().trim(),
      brandname: (med.brandname || med.BrandName || med.Brandname || med['Brand Name'] || '').trim(),
      dosagecode: (med.dosagecode || med.DosageCode || med.Dosagecode || med['Dosage Code'] || '').trim() || null
    }));

    // Check for duplicates in Excel file
    const genericNameCounts = new Map();
    const duplicateRecords = [];
    for (const med of formattedMedicines) {
      genericNameCounts.set(med.genericname, (genericNameCounts.get(med.genericname) || 0) + 1);
      if (genericNameCounts.get(med.genericname) > 1) {
        duplicateRecords.push({
          row: med.originalIndex,
          genericname: med.genericname,
          data: med
        });
      }
    }

    if (duplicateRecords.length > 0) {
      console.log('Duplicate genericname in Excel:', duplicateRecords);
      try {
        await fs.writeFile('duplicate_records.json', JSON.stringify(duplicateRecords, null, 2));
      } catch (err) {
        console.error('Error saving duplicate records:', err);
      }
    }

    // Log and filter valid records
    const validMedicines = [];
    const invalidRecords = [];
    for (const med of formattedMedicines) {
      if (med.genericname && med.brandname) {
        validMedicines.push({
          genericname: med.genericname,
          brandname: med.brandname,
          dosagecode: med.dosagecode
        });
      } else {
        invalidRecords.push({
          row: med.originalIndex,
          data: {
            genericname: med.genericname,
            brandname: med.brandname,
            dosagecode: med.dosagecode
          },
          reason: 'Missing required fields (genericname or brandname)'
        });
      }
    }

    if (validMedicines.length === 0) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
      return res.status(400).json({
        error: 'No valid data found in the Excel file',
        invalidRecords
      });
    }

    // Log invalid records for debugging
    if (invalidRecords.length > 0) {
      console.log('Invalid records:', invalidRecords);
      try {
        await fs.writeFile('invalid_records.json', JSON.stringify(invalidRecords, null, 2));
      } catch (err) {
        console.error('Error saving invalid records:', err);
      }
    }

    // Insert all records (no upsert, allow duplicates)
    const batchSize = 1000;
    let insertedCount = 0;
    const failedRecords = [];
    const initialCount = await NMRAmodel.countDocuments();
    console.log('Initial collection count:', initialCount);

    for (let i = 0; i < validMedicines.length; i += batchSize) {
      const batch = validMedicines.slice(i, i + batchSize);
      try {
        const result = await NMRAmodel.insertMany(batch, { ordered: false });
        insertedCount += result.length;
        console.log(`Batch ${i / batchSize + 1}:`, {
          inserted: result.length
        });
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} error:`, error);
        failedRecords.push(
          ...batch.map(med => ({
            genericname: med.genericname,
            reason: `Insert error: ${error.message}`
          }))
        );
      }
    }

    // Log failed records
    if (failedRecords.length > 0) {
      console.log('Failed records:', failedRecords);
      try {
        await fs.writeFile('failed_records.json', JSON.stringify(failedRecords, null, 2));
      } catch (err) {
        console.error('Error saving failed records:', err);
      }
    }

    // Verify final collection count
    const finalCount = await NMRAmodel.countDocuments();
    console.log('Final collection count:', finalCount);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.error('Error deleting uploaded file:', err);
    }

    res.json({
      message: 'Medicines processed successfully',
      totalRecords: medicines.length,
      inserted: insertedCount,
      failedRecords: failedRecords.length,
      invalidRecords: invalidRecords.length,
      duplicateRecords: duplicateRecords.length,
      initialCount,
      finalCount,
      details: {
        invalidRecords: invalidRecords.slice(0, 10),
        failedRecords: failedRecords.slice(0, 10),
        duplicateRecords: duplicateRecords.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Error uploading medicines:', error);
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    res.status(500).json({
      error: `Failed to upload medicines: ${error.message}`,
      details: error.details || {}
    });
  }
});


//initialize the openai
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/verify/:id', async (req, res) => {
  try {
    const prescriptionId = req.params.id;
    
    // Find the prescription by ID
    const prescription = await PrescriptionModel.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Check if prescription has an image
    if (!prescription.prescriptionFilePath) {
      return res.status(400).json({ error: 'No image found for this prescription' });
    }

    // Read the image file
    const imagePath = path.join(__dirname, prescription.prescriptionFilePath);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(400).json({ error: 'Prescription image file not found' });
    }

    // Preprocess the image to enhance text clarity
    let imageBuffer;
    try {
      imageBuffer = await sharp(imagePath)
        .resize({ width: 1200 })
        .sharpen({ sigma: 1 })
        .toFormat('jpeg')
        .toBuffer();
    } catch (sharpError) {
      console.error('Error processing image with sharp:', sharpError);
      return res.status(500).json({ error: 'Failed to process prescription image', details: sharpError.message });
    }
    const base64Image = imageBuffer.toString('base64');

    // Prepare the prompt for OpenAI
    const prompt = `
    Analyze this prescription image and extract all the information precisely especially the medicine names extract each word accurately. 
    Return the data in the following JSON format without any markdown or backticks for direct JSON manipulation:
    {
      "medicines": [
        {
          "name": "medicine name",
          "dosage": "dosage strength (e.g., 500mg, 10ml)",
          "frequency": "how often to take (e.g., twice daily, once daily)",
          "duration": "treatment duration (e.g., 7 days, 2 weeks)",
          "instructions": "special instructions if any",
          "quantity": "number of tablets/bottles prescribed"
        }
      ],
      "patient_info": {
        "name": "patient name if visible",
        "age": "patient age if visible",
        "gender": "patient gender if visible"
      },
      "doctor_info": {
        "name": "doctor name if visible",
        "license_number": "doctor license if visible"
      },
      "prescription_date": "date of prescription if visible (format: YYYY-MM-DD)",
      "pharmacy_info": "pharmacy name/details if visible"
    }
    
    Important: 
    - Extract medicine names exactly as written
    - If any field is not clearly visible, use null
    - Be precise with dosages and frequencies
    - Focus on accuracy over completeness
    - Return valid JSON only
    - Ensure prescription_date is in YYYY-MM-DD format or null if not visible
    `;

    // Send request to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    // Parse the response
    let extractedData;
    try {
      extractedData = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return res.status(500).json({ 
        error: 'Failed to parse prescription data',
        details: 'Invalid response format from AI service'
      });
    }

    // Verify medicines against NMRA database
    const verificationResults = await verifyMedicinesAgainstNMRA(extractedData.medicines || []);

    // Map extracted medicines to schema format
    const extractedMedicines = extractedData.medicines.map((med, index) => {
      const verificationResult = verificationResults[index] || {};
      return {
        originalText: med.name,
        name: med.name || null,
        dosage: med.dosage || null,
        frequency: med.frequency || null,
        instructions: med.instructions || null,
        verified: verificationResult.isApproved || false,
        nmraMatch: verificationResult.nmraMatch ? {
          matched: !!verificationResult.nmraMatch,
          matchedRecord: {
            genericname: verificationResult.nmraMatch.genericName || null,
            brandname: verificationResult.nmraMatch.brandName || null,
            dosagecode: verificationResult.nmraMatch.dosageCode || null
          },
          confidence: verificationResult.matchConfidence || 0
        } : {
          matched: false,
          matchedRecord: {
            genericname: null,
            brandname: null,
            dosagecode: null
          },
          confidence: 0
        }
      };
    });

    // Validate prescription_date
    let prescriptionDate = null;
    let dateValidationNote = '';
    if (extractedData.prescription_date) {
      const date = new Date(extractedData.prescription_date);
      if (!isNaN(date.valueOf())) {
        prescriptionDate = date;
      } else {
        console.warn(`Invalid prescription_date received: ${extractedData.prescription_date}`);
        dateValidationNote = 'Invalid prescription date format detected; set to null';
      }
    }

    // Determine verification status
    const totalMedicines = verificationResults.length;
    const verifiedCount = verificationResults.filter(result => result.isApproved).length;
    let verificationStatus;
    let verificationNotes;

    if (totalMedicines === 0) {
      verificationStatus = 'failed';
      verificationNotes = 'No medicines detected in prescription';
    } else if (verifiedCount === totalMedicines) {
      verificationStatus = 'verified';
      verificationNotes = 'All medicines verified successfully';
    } else if (verifiedCount > 0) {
      verificationStatus = 'manual';
      verificationNotes = `Partial verification: ${verifiedCount} out of ${totalMedicines} medicines verified; manual inspection required`;
    } else {
      verificationStatus = 'failed';
      verificationNotes = 'No medicines verified; manual inspection required';
    }

    if (dateValidationNote) {
      verificationNotes = [verificationNotes, dateValidationNote].filter(note => note).join('; ');
    }

    // Update prescription with extracted data and verification results
    const updatedPrescription = await PrescriptionModel.findByIdAndUpdate(
      prescriptionId,
      {
        extractedMedicines,
        doctorInfo: {
          name: extractedData.doctor_info?.name || null,
          license: extractedData.doctor_info?.license_number || null,
          signature: null
        },
        patientInfo: {
          name: extractedData.patient_info?.name || null,
          age: extractedData.patient_info?.age || null
        },
        prescriptionDate,
        verificationStatus,
        verificationNotes,
        verifiedAt: new Date(),
        verifiedBy: 'OpenAI GPT-4o'
      },
      { new: true }
    );

    res.json({
      success: true,
      extractedData,
      verificationResults,
      prescription: updatedPrescription
    });

  } catch (error) {
    console.error('Error verifying prescription:', error);
    res.status(500).json({ 
      error: 'Failed to verify prescription',
      details: error.message 
    });
  }
});

async function verifyMedicinesAgainstNMRA(medicines) {
  const results = [];
  
  for (const medicine of medicines) {
    try {
      let nmraMedicine = null;
      let matchType = 'none';
      let matchConfidence = 0;

      // Search by brand name (exact match)
      nmraMedicine = await NMRAmodel.findOne({
        brandname: { $regex: new RegExp(`^${escapeRegex(medicine.name)}$`, 'i') }
      });
      if (nmraMedicine) {
        matchType = 'brandname_exact';
        matchConfidence = 100;
      }

      // Search by generic name (exact match)
      if (!nmraMedicine) {
        nmraMedicine = await NMRAmodel.findOne({
          genericname: { $regex: new RegExp(`^${escapeRegex(medicine.name)}$`, 'i') }
        });
        if (nmraMedicine) {
          matchType = 'genericname_exact';
          matchConfidence = 100;
        }
      }

      // Search by brand name (partial match)
      if (!nmraMedicine) {
        nmraMedicine = await NMRAmodel.findOne({
          brandname: { $regex: new RegExp(escapeRegex(medicine.name), 'i') }
        });
        if (nmraMedicine) {
          matchType = 'brandname_partial';
          matchConfidence = calculateMatchConfidence(medicine.name, nmraMedicine.brandname);
        }
      }

      // Search by generic name (partial match)
      if (!nmraMedicine) {
        nmraMedicine = await NMRAmodel.findOne({
          genericname: { $regex: new RegExp(escapeRegex(medicine.name), 'i') }
        });
        if (nmraMedicine) {
          matchType = 'genericname_partial';
          matchConfidence = calculateMatchConfidence(medicine.name, nmraMedicine.genericname);
        }
      }

      // Search by suffix match (brand name)
      if (!nmraMedicine) {
        nmraMedicine = await findBySuffixMatch(medicine.name, 'brandname');
        if (nmraMedicine) {
          matchType = 'brandname_suffix';
          matchConfidence = calculateSuffixMatchConfidence(medicine.name, nmraMedicine.brandname);
        }
      }

      // Search by suffix match (generic name)
      if (!nmraMedicine) {
        nmraMedicine = await findBySuffixMatch(medicine.name, 'genericname');
        if (nmraMedicine) {
          matchType = 'genericname_suffix';
          matchConfidence = calculateSuffixMatchConfidence(medicine.name, nmraMedicine.genericname);
        }
      }

      results.push({
        extractedName: medicine.name,
        isApproved: !!nmraMedicine,
        nmraMatch: nmraMedicine ? {
          id: nmraMedicine._id,
          brandName: nmraMedicine.brandname,
          genericName: nmraMedicine.genericname,
          dosageCode: nmraMedicine.dosagecode,
          matchType: matchType
        } : null,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        duration: medicine.duration,
        instructions: medicine.instructions,
        quantity: medicine.quantity,
        matchConfidence: matchConfidence
      });
    } catch (error) {
      console.error(`Error verifying medicine ${medicine.name}:`, error);
      results.push({
        extractedName: medicine.name,
        isApproved: false,
        error: error.message,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        duration: medicine.duration,
        matchConfidence: 0
      });
    }
  }
  
  return results;
}

// Helper function to find medicines by suffix match
async function findBySuffixMatch(medicineName, field) {
  const suffixLength = Math.min(5, medicineName.length); // Consider last 5 characters or length of name
  const suffix = medicineName.slice(-suffixLength).toLowerCase();
  
  // Find medicines where the brandname or genericname ends with the same suffix
  const query = {
    [field]: { $regex: new RegExp(`${escapeRegex(suffix)}$`, 'i') }
  };
  
  const matches = await NMRAmodel.find(query);
  
  // If multiple matches, select the one with the highest suffix similarity
  if (matches.length > 0) {
    let bestMatch = matches[0];
    let highestConfidence = calculateSuffixMatchConfidence(medicineName, bestMatch[field]);
    
    for (const match of matches) {
      const confidence = calculateSuffixMatchConfidence(medicineName, match[field]);
      if (confidence > highestConfidence) {
        bestMatch = match;
        highestConfidence = confidence;
      }
    }
    
    return bestMatch;
  }
  
  return null;
}

// Helper function to calculate suffix match confidence
function calculateSuffixMatchConfidence(extracted, registered) {
  if (!registered) return 0;
  
  const suffixLength = Math.min(5, Math.min(extracted.length, registered.length));
  const extractedSuffix = extracted.slice(-suffixLength).toLowerCase();
  const registeredSuffix = registered.slice(-suffixLength).toLowerCase();
  
  // Calculate similarity based on suffix
  const similarity = calculateStringSimilarity(extractedSuffix, registeredSuffix);
  
  // Adjust confidence based on suffix length and overall string similarity
  const overallSimilarity = calculateStringSimilarity(extracted.toLowerCase(), registered.toLowerCase());
  return Math.round((similarity * 0.7 + overallSimilarity * 0.3) * 100);
}

// Helper function to escape regex special characters (unchanged)
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Helper function to calculate match confidence (unchanged)
function calculateMatchConfidence(extracted, registered) {
  if (!registered) return 0;
  const similarity = calculateStringSimilarity(extracted.toLowerCase(), registered.toLowerCase());
  return Math.round(similarity * 100);
}

// Helper function to calculate string similarity (unchanged)
function calculateStringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Helper function to calculate Levenshtein distance (unchanged)
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

//stats

app.get('/api/product-stats', async (req, res) => {
  try {
    const currentDate = new Date();
    const lowStockThreshold = 10; // Define low stock threshold

    // Get all products
    const allProducts = await ProductModel.find();
    const totalProducts = allProducts.length;

    // Count expired products
    const expiredProducts = allProducts.filter(product => 
      product.expiryDate && new Date(product.expiryDate) < currentDate
    ).length;

    // Count low stock products (quantity <= threshold and not expired)
    const lowStockProducts = allProducts.filter(product => 
      product.quantity <= lowStockThreshold && 
      (!product.expiryDate || new Date(product.expiryDate) >= currentDate)
    ).length;

    // Count safe and in stock products
    const safeAndInStock = allProducts.filter(product => 
      product.quantity > lowStockThreshold && 
      (!product.expiryDate || new Date(product.expiryDate) >= currentDate)
    ).length;

    const stats = {
      totalProducts,
      expiredProducts,
      lowStockProducts,
      safeAndInStock
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching product statistics:', error);
    res.status(500).json({ message: 'Error fetching product statistics' });
  }
});

//manually should verify medicines fetch
app.get('/api/manualprescriptions', async (req, res) => {
  try {
    const all = await PrescriptionModel.find({ 
      verificationStatus: { $in: ['manual', 'failed'] }
    }).sort({ uploadedAt: -1 });
    res.status(200).json(all);
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    res.status(500).json({ message: 'Error fetching delivery details' });
  }
});

//completing the prescriptions
app.put('/api/completeprescriptions/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params; // Fixed: removed .id
    const { verificationStatus, totalCost } = req.body;
    
    if (!verificationStatus || verificationStatus !== 'completed') {
      return res.status(400).json({ error: 'Invalid or missing verificationStatus. Must be "completed".' });
    }
    
    if (typeof totalCost !== 'number' || isNaN(totalCost) || totalCost <= 0) {
      return res.status(400).json({ error: 'Invalid or missing totalCost. Must be a positive number.' });
    }
    
    const prescription = await PrescriptionModel.findById(id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found.' });
    }
    
    prescription.verificationStatus = verificationStatus;
    prescription.TotalCost = totalCost; // Fixed: changed from TotalCost to totalCost
    
    const updatedPrescription = await prescription.save();
    
    res.status(200).json({
      success: true,
      prescription: updatedPrescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({ error: 'Server error occurred while updating prescription.' });
  }
});


//verified prescriptions
app.get('/api/verifiedprescriptions', async (req, res) => {
  try {
    const all = await PrescriptionModel.find({ 
      verificationStatus: { $in: ['verified'] }
    }).sort({ uploadedAt: -1 });
    res.status(200).json(all);
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    res.status(500).json({ message: 'Error fetching delivery details' });
  }
});

//completed prescriptions
app.get('/api/completedprescriptions', async (req, res) => {
  try {
    const all = await PrescriptionModel.find({ 
      verificationStatus: { $in: ['completed'] }
    }).sort({ uploadedAt: -1 });
    res.status(200).json(all);
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error);
    res.status(500).json({ message: 'Error fetching delivery details' });
  }
});



// Get all orders (admin only)
app.get('/api/getorders', authenticateJWT, async (req, res) => {
  try {
    const { email, role } = req.user; // Assuming authenticateJWT sets req.user
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthorized access. No user email found.' });
    }

    const orders = await OrderModel.find();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
});

//update order status
app.put('/api/orders/:orderId/status', authenticateJWT, async (req,res)=> {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'processing', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.status(200).json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating order status' });
  }
});

//get pending orders
app.get('/api/getpendingorders', authenticateJWT, async (req, res) => {
  try {
    const { email, role } = req.user; // Assuming authenticateJWT sets req.user
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthorized access. No user email found.' });
    }

    const orders = await OrderModel.find({status:'pending'});
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
});

//get processing orders
app.get('/api/getprocessingorders', authenticateJWT, async (req, res) => {
  try {
    const { email, role } = req.user; // Assuming authenticateJWT sets req.user
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthorized access. No user email found.' });
    }

    const orders = await OrderModel.find({status:'processing'});
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
});

//get completed orders
app.get('/api/getcompletedorders', authenticateJWT, async (req, res) => {
  try {
    const { email, role } = req.user; // Assuming authenticateJWT sets req.user
    if (!email) {
      return res.status(401).json({ success: false, message: 'Unauthorized access. No user email found.' });
    }

    const orders = await OrderModel.find({status:'completed'});
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching orders' });
  }
});


// POST /savebill - Save a new bill to database
app.post('/savebill', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      items,
      totalAmount,
      billDate,
      paymentMethod
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bill must contain at least one item'
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount must be greater than 0'
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.sellingPrice) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have productId, productName, quantity, and unitPrice'
        });
      }
      
      if (item.quantity <= 0 || item.sellingPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid quantity or price in items'
        });
      }
    }

    // Create new bill
    const newBill = new Bill({
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      items: items,
      totalAmount: totalAmount,
      billDate: billDate ? new Date(billDate) : new Date(),
      paymentMethod: paymentMethod || 'cash'
    });

    // Save to database
    const savedBill = await newBill.save();

    res.status(201).json({
      success: true,
      message: 'Bill saved successfully',
      billId: savedBill.billId,
      data: savedBill
    });

  } catch (error) {
    console.error('Error saving bill:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Bill ID already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while saving bill'
    });
  }
});


// GET summary of prescriptions and financials
app.get('/api/summary', async (req, res) => {
  try {
    // Get date range from query params (default to current month)
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date('2025-08-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date('2025-08-31T23:59:59.999Z');

    // Validate dates
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Aggregate prescription counts by status
    const prescriptionSummary = await PrescriptionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    // Format prescription counts
    const counts = {
      uploaded: ((await (PrescriptionModel.find())).length),
      verified: 0,
      completed: 0,
      processing: 0,
     
    };
    prescriptionSummary.forEach((item) => {
      counts[item._id] = item.count;
    });

    // Calculate total sales from OrderModel and BillModel
    const [orderSales, billSales] = await Promise.all([
      OrderModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$Total' },
          },
        },
      ]),
      Bill.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
          },
        },
      ])
    ]);

    const totalOrderSales = orderSales.length > 0 ? orderSales[0].totalSales : 0;
    const totalBillSales = billSales.length > 0 ? billSales[0].totalSales : 0;
    const totalSales = totalOrderSales + totalBillSales;

    // Calculate total cost from medicines
    const medicines = await ProductModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCost: {
            $sum: { $multiply: ['$quantity', '$unitprice'] },
          },
        },
      },
    ]);

    const totalCost = medicines.length > 0 ? medicines[0].totalCost : 0;
    const totalProfit = totalSales - totalCost;

    // Send response
    res.json({
      prescriptions: counts,
      financials: {
        totalSales,
        totalExpenses: totalCost,
        totalProfit,
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get orders within date range
app.get('/api/anaorders', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date('2025-08-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date('2025-08-31T23:59:59.999Z');

    // Validate dates
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Fetch orders
    const orders = await OrderModel.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('createdAt Total');

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bills within date range
app.get('/api/anabills', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date('2025-08-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date('2025-08-31T23:59:59.999Z');

    // Validate dates
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Fetch bills
    const bills = await Bill.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('createdAt totalAmount');

    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

//bar chart - online orders
app.get('/api/orderstats', async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date('2025-08-01');
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date('2025-08-31T23:59:59.999Z');

    // Validate dates
    if (isNaN(startDate) || isNaN(endDate)) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    // Fetch orders with status
    const orders = await OrderModel.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).select('createdAt status Total'); // Include status and Total

    res.json(orders);
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Corrected backend endpoint
app.get('/api/getconsultations', authenticateJWT, async(req, res) => {
  try {
    const email = req.user.email;
    console.log('User email from token:', email);
    
    if (!email) {
      return res.status(401).json({ message: 'Unauthorized Access' });
    }

    // First, let's get ALL consultations to debug
    console.log('Fetching all consultations...');
    const allConsultations = await ConsultationModel.find();
    console.log('Total consultations in database:', allConsultations.length);
    console.log('Sample consultation:', allConsultations[0]);

    // For now, return all consultations to debug
    // Later, you should filter by doctor: { doctorEmail: email }
    const consultations = allConsultations;

    console.log('Returning consultations:', consultations.length);
    return res.status(200).json(consultations);
    
  } catch (error) {
    console.error('Error fetching consultations:', error);
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});



app.get('/patients', authenticateJWT, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const doctorId = req.user.id;

    let query = { createdBy: doctorId };

    // Add search functionality
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { 'personalInfo.phone': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const patients = await Patient.find(query)
      .sort({ lastUpdated: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('patientId personalInfo medicalInfo consultationHistory createdAt lastUpdated');

    const total = await Patient.countDocuments(query);

    res.json({
      patients,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPatients: total,
        hasNext: skip + patients.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single patient with full history
app.get('/patients/:patientId', authenticateJWT, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    const patient = await Patient.findOne({ 
      patientId: patientId,
      createdBy: doctorId 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new patient
app.post('/patients', authenticateJWT, async (req, res) => {
  try {
    const doctorId = req.user.id;
    const patientData = req.body;

    // Check if patient already exists
    const existingPatient = await Patient.findOne({
      $or: [
        { 'personalInfo.email': patientData.personalInfo.email },
        { 'personalInfo.phone': patientData.personalInfo.phone }
      ]
    });

    if (existingPatient) {
      return res.status(400).json({ 
        message: 'Patient with this email or phone already exists' 
      });
    }

    const patient = new Patient({
      ...patientData,
      createdBy: doctorId
    });

    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update patient information
app.put('/patients/:patientId', authenticateJWT, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;
    const updateData = req.body;

    const patient = await Patient.findOneAndUpdate(
      { patientId: patientId, createdBy: doctorId },
      { ...updateData, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add consultation history to patient
app.post('/patients/:patientId/consultations', authenticateJWT, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;
    const doctorName = req.user.name;
    const consultationData = req.body;

    const patient = await Patient.findOne({ 
      patientId: patientId,
      createdBy: doctorId 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Create new consultation record
    const consultation = new Consultation({
      patientId: patient._id,
      doctorId: doctorId,
      appointmentDetails: consultationData.appointmentDetails,
      location: consultationData.location,
      status: 'Completed',
      consultationNotes: consultationData.consultationNotes,
      fees: consultationData.fees,
      completedAt: new Date()
    });

    await consultation.save();

    // Add to patient's consultation history
    const consultationHistory = {
      consultationId: consultation._id,
      date: new Date(),
      doctorId: doctorId,
      doctorName: doctorName,
      symptoms: consultationData.symptoms,
      diagnosis: consultationData.diagnosis,
      medications: consultationData.medications,
      notes: consultationData.notes,
      followUpRequired: consultationData.followUpRequired,
      followUpDate: consultationData.followUpDate
    };

    patient.consultationHistory.push(consultationHistory);
    patient.lastUpdated = new Date();
    await patient.save();

    res.status(201).json({
      message: 'Consultation added successfully',
      consultation: consultationHistory,
      patient: patient
    });
  } catch (error) {
    console.error('Error adding consultation:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get patient's consultation history
app.get('/patients/:patientId/consultations', authenticateJWT, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    const patient = await Patient.findOne({ 
      patientId: patientId,
      createdBy: doctorId 
    }).select('consultationHistory');

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Sort consultation history by date (newest first)
    const sortedHistory = patient.consultationHistory.sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    res.json(sortedHistory);
  } catch (error) {
    console.error('Error fetching consultation history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete patient
app.delete('/patients/:patientId', authenticateJWT, async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.id;

    const patient = await Patient.findOneAndDelete({ 
      patientId: patientId,
      createdBy: doctorId 
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Also delete related consultations
    await Consultation.deleteMany({ patientId: patient._id });

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch all patients or search by term
app.get('/api/patients', authenticateJWT, async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = {
        $or: [
          { 'name.fullName': { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ],
      };
    }
    
    const patients = await PaitentModel.find(query);
    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Add new patient
app.post('/api/patients', authenticateJWT, async (req, res) => {
  try {
    const { 
      name, 
      address, 
      phone, 
      dateOfBirth, 
      gender, 
      age, 
      medicalHistory 
    } = req.body;

    const patientData = {
      name: {
        firstName: name.firstName,
        lastName: name.lastName,
        fullName: name.fullName || `${name.firstName} ${name.lastName}`,
      },
      address,
      phone,
      dateOfBirth,
      age: age || (dateOfBirth 
        ? Math.floor((new Date() - new Date(dateOfBirth)) / (1000 * 60 * 60 * 24 * 365))
        : null),
      gender,
      medicalHistory: {
        bloodType: medicalHistory.bloodType || '',
        allergies: medicalHistory.allergies || [],
        currentMedications: medicalHistory.currentMedications || [],
        previousConsultation: false, // Default value
        consultationHistory: medicalHistory.consultationHistory || [],
      },
      lastUpdated: new Date(),
    };

    const patient = new PaitentModel(patientData);
    await patient.save();
    res.status(201).json({ patient });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

app.post('/api/patients/:id/consultations', authenticateJWT, async (req, res) => {
  try {
    const patientId = req.params.id;
    const consultationData = req.body;

    // Validate required fields
    if (!consultationData.date || !consultationData.symptoms || !consultationData.diagnosis) {
      return res.status(400).json({ message: 'Missing required consultation fields' });
    }

    // Find patient
    const patient = await PaitentModel.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // ✅ Mark previous consultation as true
    patient.medicalHistory.previousConsultation = true;

    // Add new consultation
    patient.medicalHistory.consultationHistory.push({
      ...consultationData,
      date: new Date(consultationData.date),
      followUpDate: consultationData.followUpRequired ? new Date(consultationData.followUpDate) : undefined,
    });

    patient.lastUpdated = new Date();
    await patient.save();

    res.status(201).json({ message: 'Consultation added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add consultation' });
  }
});


app.get('/getproductsbill', async (req, res) => {
  try {
    const currentDate = new Date();
    const allproducts = await ProductModel.find();
    
    
    const products = allproducts.filter(product => 
      product.quantity > 0 && product.expiryDate > currentDate
    );
    
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Health check endpoint for debugging
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', port: process.env.PORT });
});

// Error handlers for debugging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT;
if (!PORT) {
  console.error('Error: PORT environment variable is not defined');
  process.exit(1); // Fail if PORT is undefined
}
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`process.env.PORT is: ${PORT}`);
  
});