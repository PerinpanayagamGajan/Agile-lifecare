import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import EHeader from '../components/EHeader';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BookConsultation = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    user: { name: '', email: '', phone: '' },
    patient: { name: '', age: '', gender: '', reason: '' },
    medicalRecords: null,
    location: { lat: 0, lng: 0, link: '' },
    slot: { date: '', time: '' },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const api = import.meta.env.VITE_API;
  const googleApiKey = import.meta.env.VITE_GOOGLE_GEOCODING_API;

  

  // Time slots (9:00 AM - 5:00 PM, 30-minute intervals)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
  ];

  // Get current location on mount
  useEffect(() => {
    if (step === 4 && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData({
            ...formData,
            location: {
              lat: latitude,
              lng: longitude,
              link: `https://maps.google.com/?q=${latitude},${longitude}`,
            },
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
          setError('Failed to get current location. Please search or select a location.');
          setFormData({
            ...formData,
            location: {
              lat: 40.7128,
              lng: -74.0060,
              link: 'https://maps.google.com/?q=40.7128,-74.0060',
            },
          });
        }
      );
    }
  }, [step]);

  // Fetch location suggestions from Google Maps Geocoding API
 useEffect(() => {
  if (step === 4 && searchQuery && googleApiKey) {
    const fetchSuggestions = async () => {
      try {
        const response = await axios.get(
          `${api}/api/autocomplete?input=${encodeURIComponent(searchQuery)}`
        );
        console.log('API Response:', response.data);
        if (response.data.status === 'OK') {
          const results = response.data.predictions.map((prediction) => ({
            name: prediction.description,
            place_id: prediction.place_id,
          }));
          setSuggestions(results);
        } else {
          setError(`API Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Autocomplete error:', err.response ? err.response.data : err.message);
        setError('Failed to fetch location suggestions. Please try again.');
        setSuggestions([]);
      }
    };
    const timeout = setTimeout(fetchSuggestions, 500);
    return () => clearTimeout(timeout);
  } else {
    setSuggestions([]);
    if (!googleApiKey) {
      setError('API key is not loaded. Check your .env configuration.');
    }
  }
}, [searchQuery, step]);

const fetchPlaceDetails = async (placeId) => {
  try {
    const response = await axios.get(
      `${api}/api/place-details?place_id=${encodeURIComponent(placeId)}`
    );
    if (response.data.status === 'OK') {
      const { lat, lng } = response.data.result.geometry.location;
      return { lat, lng };
    } else {
      throw new Error(`Place Details Error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Place Details error:', err.message);
    setError('Failed to fetch place details. Please try again.');
    return null;
  }
};

  const handleChange = (section, field, value) => {
    setFormData({
      ...formData,
      [section]: { ...formData[section], [field]: value },
    });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, medicalRecords: e.target.files[0] });
  };

  const handleLocationChange = (lat, lng) => {
  setFormData({
    ...formData,
    location: {
      lat,
      lng,
      link: `https://maps.google.com/?q=${lat},${lng}`,
    },
  });
  setSearchQuery('');
  setSuggestions([]);
};
  const handleSuggestionSelect = async (suggestion) => {
  const coords = await fetchPlaceDetails(suggestion.place_id);
  if (coords) {
    handleLocationChange(coords.lat, coords.lng);
    setSearchQuery(suggestion.name); // Optional: Update input with selected name
    setSuggestions([]); // Clear suggestions after selection
  }
};

  const validateStep = () => {
    setError('');
    if (step === 1) {
      const { user } = formData;
      if (!user.name) return 'Name is required';
      if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        return 'Valid email is required';
      }
      if (!user.phone || !/^\d{10}$/.test(user.phone)) {
        return 'Valid 10-digit phone number is required';
      }
    } else if (step === 2) {
      const { patient } = formData;
      if (!patient.name) return 'Patient name is required';
      if (!patient.age || patient.age < 0 || patient.age > 120) {
        return 'Valid age (0-120) is required';
      }
      if (!patient.gender) return 'Gender is required';
      if (!patient.reason) return 'Medical reason is required';
    } else if (step === 3) {
      if (!formData.medicalRecords) return 'Please upload a medical record';
    } else if (step === 4) {
      if (!formData.location.link) return 'Please select a location';
    } else if (step === 5) {
      if (!formData.slot.date) return 'Please select a date';
      if (!formData.slot.time) return 'Please select a time slot';
    }
    return '';
  };

  const handleNext = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to book a consultation');
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('user', JSON.stringify(formData.user));
    formDataToSend.append('patient', JSON.stringify(formData.patient));
    formDataToSend.append('location', JSON.stringify(formData.location));
    formDataToSend.append('slot', JSON.stringify(formData.slot));
    if (formData.medicalRecords) {
      formDataToSend.append('medicalRecords', formData.medicalRecords);
    }

    try {
      const response = await axios.post(
        `${api}/book-consultation`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setSuccess('Consultation booked successfully! You will receive a confirmation soon.');
      setFormData({
        user: { name: '', email: '', phone: '' },
        patient: { name: '', age: '', gender: '', reason: '' },
        medicalRecords: null,
        location: { lat: 0, lng: 0, link: '' },
        slot: { date: '', time: '' },
      });
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book consultation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Map component for location selection
  const LocationMap = ({ lat, lng, onLocationChange }) => {
    const map = useMap();
    useEffect(() => {
      map.setView([lat, lng], 15);
    }, [lat, lng, map]);

    return (
      <Marker
        position={[lat, lng]}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng();
            onLocationChange(lat, lng);
          },
        }}
      />
    );
  };

  // Animation variants
  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.3, ease: 'easeIn' } },
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.1 },
    }),
  };

  const messageVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
  };

  return (
    <>
      <EHeader />
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold text-blue-900 mb-8 text-center">
            Book a Home Consultation
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            Schedule a consultation with our healthcare professionals in just a few steps.
          </p>

          {/* Step Indicator */}
          <div className="flex justify-between mb-8">
            {['User Details', 'Patient Details', 'Medical Records', 'Location', 'Time Slot'].map((label, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                    step > index + 1 ? 'bg-green-500' : step === index + 1 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className="text-sm mt-2 text-gray-700">{label}</span>
              </div>
            ))}
          </div>

          {/* Error/Success Messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-center"
                role="alert"
                aria-live="polite"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 text-center"
                role="alert"
                aria-live="polite"
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Steps */}
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-2xl font-semibold text-blue-900 mb-6">User Details</h2>
                  <div className="space-y-6">
                    <motion.div variants={fieldVariants} custom={0}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="user-name">
                        Full Name
                      </label>
                      <input
                        id="user-name"
                        type="text"
                        name="name"
                        value={formData.user.name}
                        onChange={(e) => handleChange('user', 'name', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Enter your full name"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={1}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="user-email">
                        Email
                      </label>
                      <input
                        id="user-email"
                        type="email"
                        name="email"
                        value={formData.user.email}
                        onChange={(e) => handleChange('user', 'email', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Enter your email"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={2}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="user-phone">
                        Phone Number
                      </label>
                      <input
                        id="user-phone"
                        type="tel"
                        name="phone"
                        value={formData.user.phone}
                        onChange={(e) => handleChange('user', 'phone', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Enter your phone number"
                        pattern="\d{10}"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={3} className="flex justify-end">
                      <button
                        onClick={handleNext}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="Proceed to next step"
                      >
                        Next
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-2xl font-semibold text-blue-900 mb-6">Patient Details</h2>
                  <div className="space-y-6">
                    <motion.div variants={fieldVariants} custom={0}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patient-name">
                        Patient Name
                      </label>
                      <input
                        id="patient-name"
                        type="text"
                        name="name"
                        value={formData.patient.name}
                        onChange={(e) => handleChange('patient', 'name', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Enter patient name"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={1}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patient-age">
                        Age
                      </label>
                      <input
                        id="patient-age"
                        type="number"
                        name="age"
                        value={formData.patient.age}
                        onChange={(e) => handleChange('patient', 'age', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Enter patient age"
                        min="0"
                        max="120"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={2}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patient-gender">
                        Gender
                      </label>
                      <select
                        id="patient-gender"
                        name="gender"
                        value={formData.patient.gender}
                        onChange={(e) => handleChange('patient', 'gender', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        required
                        aria-required="true"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={3}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="patient-reason">
                        Reason For Consultation
                      </label>
                      <textarea
                        id="patient-reason"
                        name="reason"
                        value={formData.patient.reason}
                        onChange={(e) => handleChange('patient', 'reason', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        placeholder="Describe the patient's medical reason"
                        rows="4"
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={4} className="flex justify-between">
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:bg-gray-300"
                        aria-label="Go back to previous step"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="Proceed to next step"
                      >
                        Next
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-2xl font-semibold text-blue-900 mb-6">Upload Medical Records</h2>
                  <div className="space-y-6">
                    <motion.div variants={fieldVariants} custom={0}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="medical-records">
                        Medical Records
                      </label>
                      <input
                        id="medical-records"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        required
                        aria-required="true"
                      />
                      {formData.medicalRecords && (
                        <p className="text-sm text-gray-600 mt-2">Selected: {formData.medicalRecords.name}</p>
                      )}
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={1} className="flex justify-between">
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:bg-gray-300"
                        aria-label="Go back to previous step"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="Proceed to next step"
                      >
                        Next
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-2xl font-semibold text-blue-900 mb-6">Select Home Location</h2>
                  <div className="space-y-6">
                    <motion.div variants={fieldVariants} custom={0} className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="location-search">
                        Search Location
                      </label>
                      <input
                        id="location-search"
                        type="text"
                        placeholder="Search for a location (e.g., 123 Main St)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        aria-autocomplete="list"
                        aria-controls="location-suggestions"
                      />
                      {suggestions.length > 0 && (
                          <ul
                            id="location-suggestions"
                            className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg"
                            role="listbox"
                          >
                            {suggestions.map((suggestion, index) => (
                              <li
                                key={index}
                                onClick={() => handleSuggestionSelect(suggestion)} // Async function call
                                className="px-4 py-2 text-gray-800 hover:bg-blue-100 cursor-pointer"
                                role="option"
                                aria-selected={false}
                              >
                                {suggestion.name}
                              </li>
                            ))}
                          </ul>
                        )}
                      <p className="text-sm text-gray-500 mt-1">Enter an address or drag the marker on the map</p>
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={1}>
                      <div className="h-96 border border-gray-300 rounded-lg overflow-hidden">
                        {formData.location.lat !== 0 && formData.location.lng !== 0 && (
                          <MapContainer
                            center={[formData.location.lat, formData.location.lng]}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                            aria-label="Drag to set location"
                          >
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <LocationMap
                              lat={formData.location.lat}
                              lng={formData.location.lng}
                              onLocationChange={handleLocationChange}
                            />
                          </MapContainer>
                        )}
                      </div>
                      {formData.location.link && (
                        <p className="text-sm text-gray-600 mt-2">
                          Selected Location:{' '}
                          <a
                            href={formData.location.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View on Google Maps
                          </a>
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={2} className="flex justify-between">
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:bg-gray-300"
                        aria-label="Go back to previous step"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleNext}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="Proceed to next step"
                      >
                        Next
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <h2 className="text-2xl font-semibold text-blue-900 mb-6">Select Time Slot</h2>
                  <div className="space-y-6">
                    <motion.div variants={fieldVariants} custom={0}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="slot-date">
                        Date
                      </label>
                      <input
                        id="slot-date"
                        type="date"
                        name="date"
                        value={formData.slot.date}
                        onChange={(e) => handleChange('slot', 'date', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        min={new Date().toISOString().split('T')[0]}
                        required
                        aria-required="true"
                      />
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={1}>
                      <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="slot-time">
                        Time Slot
                      </label>
                      <select
                        id="slot-time"
                        name="time"
                        value={formData.slot.time}
                        onChange={(e) => handleChange('slot', 'time', e.target.value)}
                        disabled={loading}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                        required
                        aria-required="true"
                      >
                        <option value="">Select a time slot</option>
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                    <motion.div variants={fieldVariants} custom={2} className="flex justify-between">
                      <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-5 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:ring-2 focus:ring-gray-400 focus:outline-none disabled:bg-gray-300"
                        aria-label="Go back to previous step"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-5 py-2.5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        aria-label="Book consultation"
                      >
                        {loading ? 'Booking...' : 'Book Consultation'}
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BookConsultation;