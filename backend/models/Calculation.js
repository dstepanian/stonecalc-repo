const mongoose = require('mongoose');

const CalculationSchema = new mongoose.Schema({
  inputType: { type: String }, // 'dimensions' | 'volume'
  shape: { type: String }, // 'rectangular' | 'cylinder' | null
  dimensions: { type: Object },
  volume_cm3: { type: Number },
  title: { type: String },
  material: { type: String },
  density_g_cm3: { type: Number },
  weight_g: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Calculation', CalculationSchema);
