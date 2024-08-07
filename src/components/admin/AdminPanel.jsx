import React, { useState, useEffect } from 'react';
import { ref, set, remove, onValue } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { database, storage } from '../../firebase';
import './AdminPanel.css';

const AdminPanel = () => {
  const [watches, setWatches] = useState({});
  const [testimonials, setTestimonials] = useState({});
  const [activeTab, setActiveTab] = useState('watches');
  const [currentItem, setCurrentItem] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const initialWatchState = {
    brand: '', model: '', cost: '', size: '', movement: '',
    conditionOfO: '', color: '', scope: '', description: '',
    available: true, images: [], strap: '',
    category: "Men's Watches", tag: ''
  };

  const initialTestimonialState = {
    name: '', text: '', rating: 5
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchWatches(), fetchTestimonials()]);
      } catch (error) {
        setError("Error loading data: " + error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchWatches = () => {
    return new Promise((resolve, reject) => {
      const watchesRef = ref(database, 'watches');
      onValue(watchesRef, 
        (snapshot) => {
          setWatches(snapshot.val() || {});
          resolve();
        }, 
        (error) => {
          console.error("Error fetching watches:", error);
          reject(error);
        }
      );
    });
  };

  const fetchTestimonials = () => {
    return new Promise((resolve, reject) => {
      const testimonialsRef = ref(database, 'testimonials');
      onValue(testimonialsRef, 
        (snapshot) => {
          setTestimonials(snapshot.val() || {});
          resolve();
        }, 
        (error) => {
          console.error("Error fetching testimonials:", error);
          reject(error);
        }
      );
    });
  };

  const handleInputChange = (e) => {
    setCurrentItem({ ...currentItem, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const fileArray = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    const existingImages = Array.isArray(currentItem.images) ? currentItem.images : [];
    setCurrentItem({ ...currentItem, images: [...existingImages, ...fileArray] });
  };

  const removeImageInput = (index) => {
    const newImages = currentItem.images.filter((_, i) => i !== index);
    setCurrentItem({ ...currentItem, images: newImages });
  };

  const uploadImage = async (file) => {
    const imageRef = storageRef(storage, `watches/${Date.now()}_${file.name}`);
    await uploadBytes(imageRef, file);
    return getDownloadURL(imageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const itemId = currentItem.id || Date.now().toString();
      let itemData = { ...currentItem, id: itemId };

      if (activeTab === 'watches') {
        const imageUrls = await Promise.all(
          currentItem.images.map(async (image) => {
            if (image.file) {
              return await uploadImage(image.file);
            }
            return image.url;
          })
        );
        itemData.images = imageUrls.map(url => ({ url }));
      }

      const itemRef = ref(database, `${activeTab}/${itemId}`);
      await set(itemRef, itemData);
      setMessage(`${activeTab.slice(0, -1)} successfully updated.`);
      setCurrentItem(activeTab === 'watches' ? initialWatchState : initialTestimonialState);
    } catch (error) {
      setMessage(`Error updating ${activeTab.slice(0, -1)}: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${activeTab.slice(0, -1)}?`)) {
      setLoading(true);
      try {
        const itemRef = ref(database, `${activeTab}/${id}`);
        await remove(itemRef);
        setMessage(`${activeTab.slice(0, -1)} successfully deleted.`);
      } catch (error) {
        setMessage(`Error deleting ${activeTab.slice(0, -1)}: ${error.message}`);
      }
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setCurrentItem({ ...item });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderWatchForm = () => (
    <>
      <input name="brand" value={currentItem.brand || ''} onChange={handleInputChange} placeholder="Brand" required />
      <input name="model" value={currentItem.model || ''} onChange={handleInputChange} placeholder="Model" required />
      <input name="cost" value={currentItem.cost || ''} onChange={handleInputChange} placeholder="Cost" required />
      <input name="size" value={currentItem.size || ''} onChange={handleInputChange} placeholder="Size" required />
      <input name="movement" value={currentItem.movement || ''} onChange={handleInputChange} placeholder="Movement" required />
      <input name="description" value={currentItem.description || ''} onChange={handleInputChange} placeholder="Description" />
      {/* <input name="conditionOfO" value={currentItem.conditionOfO || ''} onChange={handleInputChange} placeholder="Condition" /> */}
      {/* <input name="color" value={currentItem.color || ''} onChange={handleInputChange} placeholder="Color" /> */}
      {/* <input name="scope" value={currentItem.scope || ''} onChange={handleInputChange} placeholder="Scope" /> */}
      <label className="checkbox-label">
        <input 
          type="checkbox" 
          name="available" 
          checked={currentItem.available || false} 
          onChange={(e) => setCurrentItem({...currentItem, available: e.target.checked})}
        /> 
        In Stock
      </label>
      <input name="strap" value={currentItem.strap || ''} onChange={handleInputChange} placeholder="Strap" />
      {/* <input name="sku" value={currentItem.sku || 'N/A'} onChange={handleInputChange} placeholder="SKU" /> */}
      <select 
  name="category" 
  value={currentItem.category || "Men's Watches"} 
  onChange={handleInputChange} 
  required
>
  <option value="Men's Watches">Men's Watches</option>
  <option value="Women's Watches">Women's Watches</option>
</select>

      {/* <input name="tag" value={currentItem.tag || ''} onChange={handleInputChange} placeholder="Tag" /> */}
      <div className="image-inputs">
        <h4>Images (up to 10)</h4>
        <input type="file" multiple onChange={handleFileChange} />
        {currentItem.images && currentItem.images.map((image, index) => (
          <div key={index} className="image-preview">
            <img src={image.preview || image.url} alt={`Preview ${index}`} style={{width: '100px', height: '100px', objectFit: 'cover'}} />
            <button type="button" onClick={() => removeImageInput(index)} className="remove-image">Remove</button>
          </div>
        ))}
      </div>
    </>
  );

  const renderTestimonialForm = () => (
    <>
      <input name="name" value={currentItem.name || ''} onChange={handleInputChange} placeholder="Name" required />
      <textarea name="text" value={currentItem.text || ''} onChange={handleInputChange} placeholder="Testimonial" required></textarea>
      <input type="number" name="rating" min="1" max="5" value={currentItem.rating || 5} onChange={handleInputChange} placeholder="Rating (1-5)" required />
    </>
  );

  const renderWatchList = () => (
    <div className="watch-list">
      {Object.entries(watches).map(([id, watch]) => (
        <div key={id} className="watch-item">
          <h4>{watch.brand} {watch.model}</h4>
          <p>Price: {formatCurrency(watch.cost)}</p>
          <div className="image-preview-container">
            {watch.images && watch.images.map((img, index) => (
              <img key={index} src={img.url} alt={`Preview of ${watch.brand} ${watch.model} ${index + 1}`} className="watch-image-preview"/>
            ))}
          </div>
          <p>Size: {watch.size}</p>
          <p>Movement: {watch.movement}</p>
          {/* <p>Condition: {watch.conditionOfO}</p> */}
          <p>Color: {watch.color}</p>
          {/* <p>Scope: {watch.scope}</p> */}
          <p>Category: {watch.category}</p>
          {/* <p>Tag: {watch.tag}</p> */}
          <button onClick={() => handleEdit(watch)} className="edit-button">Edit</button>
          <button onClick={() => handleDelete(id)} className="delete-button">Delete</button>
        </div>
      ))}
    </div>
  );

  const renderTestimonialList = () => (
    <div className="testimonial-list">
      {Object.entries(testimonials).map(([id, testimonial]) => (
        <div key={id} className="testimonial-item">
          <h4>{testimonial.name}</h4>
          <p>Rating: {testimonial.rating}</p>
          <p>{testimonial.text}</p>
          <button onClick={() => handleEdit(testimonial)} className="edit-button">Edit</button>
          <button onClick={() => handleDelete(id)} className="delete-button">Delete</button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="tabs">
        <button className={activeTab === 'watches' ? 'active' : ''} onClick={() => setActiveTab('watches')}>Watches</button>
        <button className={activeTab === 'testimonials' ? 'active' : ''} onClick={() => setActiveTab('testimonials')}>Testimonials</button>
      </div>
      <form onSubmit={handleSubmit}>
        {activeTab === 'watches' ? renderWatchForm() : renderTestimonialForm()}
        <button type="submit" className="submit-button" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </form>
      {message && <p className="message">{message}</p>}
      {error && <p className="error">{error}</p>}
      <div className="list-container">
        {loading ? <p>Loading...</p> : (activeTab === 'watches' ? renderWatchList() : renderTestimonialList())}
      </div>
    </div>
  );
};

export default AdminPanel;
