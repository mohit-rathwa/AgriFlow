import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const cropsList = ['Onion', 'Wheat', 'Rice', 'Tomato', 'Potato', 'Maize', 'Groundnut'];

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'farmer',
    phoneNumber: '',
    state: '',
    district: '',
    crops: [],
    mandiName: ''
  });
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCropChange = (e) => {
    const value = e.target.value;
    const currentCrops = [...formData.crops];
    if (e.target.checked) {
      currentCrops.push(value);
    } else {
      const index = currentCrops.indexOf(value);
      if (index > -1) currentCrops.splice(index, 1);
    }
    setFormData({ ...formData, crops: currentCrops });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords don't match!");
    }
    
    try {
      const user = await register(formData);
      toast.success('Registration successful!');
      if (user.role === 'mandiAgent') {
        toast('Your account is pending admin approval');
        navigate('/mandi');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">AF</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Get started with AgriFlow</p>
        </div>

        <div className="glass-card p-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
              <input type="text" required name="name" className="input-field" value={formData.name} onChange={handleChange} placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address *</label>
              <input type="email" required name="email" className="input-field" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
              <input type="password" required name="password" className="input-field" value={formData.password} onChange={handleChange} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password *</label>
              <input type="password" required name="confirmPassword" className="input-field" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
              <select name="role" required className="input-field bg-slate-900" value={formData.role} onChange={handleChange}>
                <option value="farmer">Farmer</option>
                <option value="mandiAgent">Mandi Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number (Optional)</label>
              <input type="text" name="phoneNumber" className="input-field" value={formData.phoneNumber} onChange={handleChange} placeholder="+91 9876543210" />
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-6 mt-6">
            <h3 className="text-lg font-medium text-emerald-400 mb-4">
              {formData.role === 'farmer' ? 'Farm Details' : 'Mandi Details'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">State *</label>
                <input type="text" required name="state" className="input-field" value={formData.state} onChange={handleChange} placeholder="e.g. Maharashtra" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">District *</label>
                <input type="text" required name="district" className="input-field" value={formData.district} onChange={handleChange} placeholder="e.g. Nashik" />
              </div>

              {formData.role === 'farmer' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Crops Grown</label>
                  <div className="flex flex-wrap gap-3">
                    {cropsList.map(crop => (
                      <label key={crop} className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 cursor-pointer hover:border-emerald-500 transition-colors">
                        <input type="checkbox" value={crop} checked={formData.crops.includes(crop)} onChange={handleCropChange} className="accent-emerald-500 w-4 h-4" />
                        <span className="text-sm text-slate-300">{crop}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.role === 'mandiAgent' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Mandi Name *</label>
                  <input type="text" required={formData.role === 'mandiAgent'} name="mandiName" className="input-field" value={formData.mandiName} onChange={handleChange} placeholder="e.g. Lasalgaon Onion Market" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3 mt-8">
            Create Account
          </button>
        </form>

        </div>

        <p className="mt-5 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
