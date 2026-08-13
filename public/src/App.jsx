import React, { useState, useRef } from 'react';
import { Upload, ChevronRight, Sparkles, BookOpen, Settings, Download, Trash2, Plus, Lock, Unlock } from 'lucide-react';

const PhotoAlbumApp = () => {
  const [step, setStep] = useState('upload'); // upload, context, style, arrange, edit, preview
  const [images, setImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [story, setStory] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('anthropic_api_key') || '');
  const [loading, setLoading] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [enhanceImages, setEnhanceImages] = useState(true);
  const [albumTitle, setAlbumTitle] = useState('My Album');
  const [editedCaptions, setEditedCaptions] = useState({});
  const fileInputRef = useRef(null);

  const styles = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Timeless elegance with generous spacing',
      bg: 'bg-white',
      accentColor: '#1a1a1a',
      layout: 'grid-cols-2',
      spacing: 'gap-6'
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Bold, minimalist with dynamic layouts',
      bg: 'bg-gray-50',
      accentColor: '#0066cc',
      layout: 'grid-cols-3',
      spacing: 'gap-4'
    },
    {
      id: 'editorial',
      name: 'Editorial',
      description: 'Magazine-style with mixed sizes',
      bg: 'bg-stone-50',
      accentColor: '#c41e3a',
      layout: 'mixed',
      spacing: 'gap-3'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Ultra clean, one photo per page',
      bg: 'bg-white',
      accentColor: '#666666',
      layout: 'grid-cols-1',
      spacing: 'gap-8'
    }
  ];

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages(prev => [...prev, event.target.result]);
        setImageFiles(prev => [...prev, file]);
      };
      reader.readAsDataURL(file);
    });
  };

  const saveApiKey = () => {
    localStorage.setItem('anthropic_api_key', apiKey);
  };

  const analyzePhotos = async () => {
    if (!apiKey || !story || images.length === 0) {
      alert('Please provide API key, story, and images');
      return;
    }

    setLoading(true);
    try {
      // Create message with all images for Claude to analyze
      const imageContent = images.map((img, idx) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: img.split(',')[1]
        }
      }));

      const textPrompt = {
        type: 'text',
        text: `You are a professional photo editor creating an album. I'm uploading ${images.length} photos.

Story/Context: "${story}"

Please analyze these photos and:
1. Rank them by: emotional impact, composition quality, how well they tell the story
2. For each photo, assess: quality (low/medium/high), if enhancement would help (yes/no + why)
3. Suggest which photos work best together
4. Recommend 8-12 best photos for the album

Respond in this exact JSON format (ONLY JSON, no other text):
{
  "photoAnalysis": [
    {
      "index": 0,
      "quality": "high|medium|low",
      "emotionalImpact": 8,
      "compositionScore": 7,
      "storyRelevance": 9,
      "needsEnhancement": false,
      "enhancementSuggestion": "already perfect",
      "story": "brief description of what this photo captures"
    }
  ],
  "recommendedIndices": [0, 2, 4, 7, 9, 12, 15, 18],
  "albumNarrative": "Brief suggested narrative flow of the album"
}`
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-1',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [textPrompt, ...imageContent]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.content[0].text;
      
      // Extract JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid response format');
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Set selected photos based on AI recommendation
      setSelectedPhotos(analysis.recommendedIndices);
      setStep('style');
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Error analyzing photos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePhotoSelection = (index) => {
    setSelectedPhotos(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const arrangeAlbum = () => {
    if (!selectedStyle) {
      alert('Please select a style');
      return;
    }
    setStep('arrange');
  };

  const reorderPhotos = (fromIndex, toIndex) => {
    const newOrder = [...selectedPhotos];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    setSelectedPhotos(newOrder);
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const exportToPDF = async () => {
    // Create a simple PDF export by rendering the album as images
    const albumEl = document.getElementById('album-preview');
    if (!albumEl) return;

    try {
      // Using html2pdf for simplicity
      const element = albumEl.cloneNode(true);
      
      // Create a new window for printing
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${albumTitle}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Georgia', serif; background: white; }
              .album-page { page-break-after: always; padding: 40px; background: white; min-height: 100vh; }
              .album-title { text-align: center; font-size: 32px; margin-bottom: 40px; color: #1a1a1a; }
              img { max-width: 100%; height: auto; margin-bottom: 20px; }
              .caption { font-size: 12px; color: #666; margin-top: 8px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="album-page">
              <h1 class="album-title">${albumTitle}</h1>
              ${selectedPhotos.map(idx => `
                <div>
                  <img src="${images[idx]}" alt="Photo ${idx}" />
                  <div class="caption">${editedCaptions[idx] || ''}</div>
                </div>
              `).join('')}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      alert('Error exporting PDF: ' + error.message);
    }
  };

  // ==================== RENDER METHODS ====================

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Photo Album AI</h1>
          </div>
          <p className="text-gray-600 mb-6">Enter your Anthropic API key to get started.</p>
          <input
            type="password"
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={saveApiKey}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Continue
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Get your API key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
          </p>
        </div>
      </div>
    );
  }

  // ===== STEP 1: UPLOAD =====
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900">Create Album</h1>
            <button
              onClick={() => setApiKey('')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Change API Key
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 mb-8">
            <div className="text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Your Photos</h2>
              <p className="text-gray-600 mb-8">Start with 5–50 images. AI will select the best ones.</p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition mb-4"
              >
                Choose Photos
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          </div>

          {images.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Uploaded: {images.length} photos
              </h3>
              <div className="grid grid-cols-4 gap-4 mb-8">
                {images.map((img, idx) => (
                  <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                    <img src={img} alt={`Upload ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setStep('context')}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== STEP 2: CONTEXT =====
  if (step === 'context') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tell Your Story</h1>
          <p className="text-gray-600 mb-8">Help AI understand the narrative</p>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              What's this album about?
            </label>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="E.g., 'Summer trip to Iceland 2024 - hiking adventures, scenic landscapes, and golden hour moments. I want to capture the sense of wonder and discovery.'"
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">Be specific about the mood, location, and memories</p>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={analyzePhotos}
                disabled={loading || !story}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze Photos <Sparkles className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 3: SELECT STYLE =====
  if (step === 'style') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Choose Style</h1>
          <p className="text-gray-600 mb-8">Select the visual direction for your album</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {styles.map(style => (
              <div
                key={style.id}
                onClick={() => setSelectedStyle(style)}
                className={`cursor-pointer rounded-lg border-2 p-6 transition ${
                  selectedStyle?.id === style.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`h-40 rounded mb-4 ${style.bg} border border-gray-200 flex items-center justify-center`}>
                  <p className="text-gray-400 text-sm">Preview: {style.name}</p>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{style.name}</h3>
                <p className="text-sm text-gray-600">{style.description}</p>
                {selectedStyle?.id === style.id && (
                  <div className="mt-4 flex items-center gap-2 text-blue-600 font-semibold">
                    <span>✓ Selected</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={enhanceImages}
                onChange={(e) => setEnhanceImages(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <label className="font-semibold text-gray-900">Enhance images with AI</label>
                <p className="text-sm text-gray-600">Improve lighting, sharpness, and color</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('context')}
              className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={arrangeAlbum}
              disabled={!selectedStyle}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              Continue to Arrangement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 4: ARRANGE =====
  if (step === 'arrange') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Arrange Album</h1>
          <p className="text-gray-600 mb-8">AI selected {selectedPhotos.length} photos. Reorder or remove as needed.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {selectedPhotos.map((photoIdx, orderIdx) => (
              <div
                key={orderIdx}
                className="relative group cursor-move rounded-lg overflow-hidden bg-gray-200 aspect-square"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', orderIdx);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  reorderPhotos(fromIndex, orderIdx);
                }}
              >
                <img
                  src={images[photoIdx]}
                  alt={`Photo ${photoIdx}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2">
                  <button
                    onClick={() => removePhoto(orderIdx)}
                    className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="absolute top-2 left-2 bg-black text-white px-2 py-1 rounded text-xs font-semibold">
                  {orderIdx + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('style')}
              className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={() => setStep('preview')}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Preview Album
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 5: PREVIEW & EDIT =====
  if (step === 'preview') {
    const currentStyle = styles.find(s => s.id === selectedStyle?.id);
    
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Album Preview</h1>
              <p className="text-gray-600">Edit titles and captions, then export</p>
            </div>
            <button
              onClick={() => setStep('arrange')}
              className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              ← Back
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Album Title</label>
            <input
              type="text"
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div
            id="album-preview"
            className={`${currentStyle?.bg} rounded-lg shadow-lg p-12 mb-8`}
          >
            <h2 className="text-4xl font-bold text-center mb-12" style={{ color: currentStyle?.accentColor }}>
              {albumTitle}
            </h2>

            <div className={`grid ${currentStyle?.layout} ${currentStyle?.spacing}`}>
              {selectedPhotos.map((photoIdx, idx) => (
                <div key={idx} className="rounded-lg overflow-hidden shadow-md">
                  <img
                    src={images[photoIdx]}
                    alt={`Album photo ${idx}`}
                    className={enhanceImages ? 'brightness-110 contrast-110' : ''}
                  />
                  <input
                    type="text"
                    value={editedCaptions[photoIdx] || ''}
                    onChange={(e) =>
                      setEditedCaptions(prev => ({ ...prev, [photoIdx]: e.target.value }))
                    }
                    placeholder="Add caption (optional)"
                    className="w-full px-3 py-2 text-sm border-t border-gray-200 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={exportToPDF}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export to PDF
            </button>
            <button
              onClick={() => {
                setImages([]);
                setSelectedPhotos([]);
                setStep('upload');
              }}
              className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default PhotoAlbumApp;
