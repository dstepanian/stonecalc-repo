require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const Calculation = require('./models/Calculation');

const app = express();
app.use(cors());
app.use(express.json());

const DENSITIES = { granite: 2.7, marble: 2.6, basalt: 2.9, limestone: 2.6, sandstone: 2.3 };

app.post('/api/calc', async (req, res) => {
  try {
    const { inputType, shape, dimensions = {}, volume_liters, material = 'granite', title, save } = req.body;

    let volume_cm3 = 0;

    if (inputType === 'dimensions') {
      if (shape === 'rectangular') {
        const { length_cm = 0, width_cm = 0, height_cm = 0 } = dimensions;
        volume_cm3 = Number(length_cm) * Number(width_cm) * Number(height_cm);
      } else if (shape === 'cylinder') {
        const { radius_cm = 0, height_cm = 0 } = dimensions;
        volume_cm3 = Math.PI * Math.pow(Number(radius_cm), 2) * Number(height_cm);
      } else {
        return res.status(400).json({ error: 'Unsupported shape or missing dimensions' });
      }
    } else if (inputType === 'volume') {
      if (volume_liters == null) return res.status(400).json({ error: 'Missing volume_liters' });
      volume_cm3 = Number(volume_liters) * 1000;
    } else {
      return res.status(400).json({ error: 'Invalid inputType' });
    }

    const density = DENSITIES[material] || DENSITIES.granite;
    const weight_g = volume_cm3 * density;

    const result = {
      volume_cm3: Math.round(volume_cm3 * 100) / 100,
      density_g_cm3: density,
      weight_g: Math.round(weight_g * 100) / 100,
      weight_kg: Math.round((weight_g / 1000) * 100000) / 100000
    };

    if (save) {
      await Calculation.create({
        inputType,
        shape,
        dimensions,
        title,
        volume_cm3: result.volume_cm3,
        material,
        density_g_cm3: density,
        weight_g: result.weight_g
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const items = await Calculation.find().sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Calculation.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/stonecalc';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
  })
  .catch(err => console.error('Mongo connection error', err));
