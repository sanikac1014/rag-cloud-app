import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  PlusIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useApplications } from '../context/ApplicationsContext';
import { normalizeText } from '../utils/textNormalizer';
import { CopyToClipboard } from 'react-copy-to-clipboard';

const GeneratePage = ({ data, onDataUpdate, onRefresh, isLoading }) => {
  // Step inputs
  const [companyName, setCompanyName] = useState('');
  const [productName, setProductName] = useState('');

  // Move version to Step 2
  const [version, setVersion] = useState('00');

  // Step 3 details
  const [url, setUrl] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [categories, setCategories] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');
  const [otherSelected, setOtherSelected] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const dropdownRef = useRef(null);
  const fieldRef = useRef(null);

  const normalizeCategory = (s) => (s || '')
    .replace(/[\[\]'\"]+/g, '')
    .replace(/\]$/, '')
    .trim();

  const allUniqueCategories = useMemo(() => {
    const map = new Map();
    Object.values(data?.fuid_mappings || {}).forEach(d => {
      const cats = d?.categories;
      if (!cats) return;
      const arr = Array.isArray(cats) ? cats : String(cats).split(',');
      arr.map(c => normalizeCategory(String(c)))
         .filter(Boolean)
         .forEach(c => { const k=c.toLowerCase(); if(!map.has(k)) map.set(k,c); });
    });
    return Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  }, [data]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return allUniqueCategories;
    return allUniqueCategories.filter(c => c.toLowerCase().includes(q));
  }, [allUniqueCategories, categorySearch]);

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => {
      const exists = prev.includes(cat);
      const next = exists ? prev.filter(c => c !== cat) : [...prev, cat];
      setCategories(next.join(', '));
      return next;
    });
  };

  const toggleOther = () => {
    setOtherSelected(prev => {
      const next = !prev;
      if (!next) setOtherCategory('');
      return next;
    });
  };

  const applyOtherCategory = () => {
    const custom = normalizeCategory(otherCategory);
    if (!custom) return;
    if (!selectedCategories.includes(custom)) {
      const next = [...selectedCategories, custom];
      setSelectedCategories(next);
      setCategories(next.join(', '));
    }
    setShowCategoriesDropdown(false);
    setOtherSelected(false);
    setOtherCategory('');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!showCategoriesDropdown) return;
      const dd = dropdownRef.current;
      const fld = fieldRef.current;
      if (dd && !dd.contains(e.target) && fld && !fld.contains(e.target)) {
        setShowCategoriesDropdown(false);
        setCategorySearch('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showCategoriesDropdown]);

  const [submitting, setSubmitting] = useState(false);

  // Multi-step state
  const [formStep, setFormStep] = useState(1); // 1: company, 2: product+version, 3: details
  const [showCompanySuggestion, setShowCompanySuggestion] = useState(false);
  const [showProductSuggestion, setShowProductSuggestion] = useState(false);
  const [suggestedCompany, setSuggestedCompany] = useState('');
  const [suggestedProduct, setSuggestedProduct] = useState('');
  const [finalCompanyName, setFinalCompanyName] = useState('');
  const [finalProductName, setFinalProductName] = useState('');
  const [existingFuid, setExistingFuid] = useState(null);
  const [existingFuidData, setExistingFuidData] = useState(null);
  const [showExistingNow, setShowExistingNow] = useState(false);
  const [companyExists, setCompanyExists] = useState(false);
  const [productExists, setProductExists] = useState(false);
  const [copied, setCopied] = useState(false);

  // New: approval confirmation modal
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false);

  const { addNewApplication } = useApplications();

  // Helpers
  const getUniqueCompaniesAndProducts = () => {
    if (!data || !data.fuid_mappings) return { companies: [], products: [] };
    const companies = new Set();
    const products = new Set();
    Object.values(data.fuid_mappings).forEach(fuidData => {
      if (fuidData.company) companies.add(fuidData.company);
      if (fuidData.product) products.add(fuidData.product);
    });
    return { companies: Array.from(companies).sort(), products: Array.from(products).sort() };
  };

  const getStringSimilarity = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        matrix[i][j] = str1[i - 1] === str2[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + 1);
      }
    }
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  };

  const checkIfExists = (name, type) => {
    if (!data || !data.fuid_mappings) return false;
    const normalizedName = (name || '').toLowerCase().trim();
    for (const fuidData of Object.values(data.fuid_mappings)) {
      const existingName = type === 'company' ? fuidData.company : fuidData.product;
      if (existingName && existingName.toLowerCase().trim() === normalizedName) return true;
    }
    return false;
  };

  const findClosestMatch = (input, options) => {
    if (!input || !options.length) return null;
    const lowerInput = input.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;
    for (const option of options) {
      const lowerOption = option.toLowerCase().trim();
      if (lowerOption === lowerInput) return null; // exact match
    }
    options.forEach(option => {
      const lowerOption = option.toLowerCase().trim();
      const similarity = getStringSimilarity(lowerInput, lowerOption);
      if (similarity > 0.6 && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = option;
      }
    });
    return bestMatch;
  };

  const normalized = (s) => normalizeText(s || '');
  const checkExactFuid = (company, product, ver) => {
    const cm = normalized(company);
    const pm = normalized(product);
    const v = (ver || '00').trim();
    for (const [fuid, fuidData] of Object.entries(data?.fuid_mappings || {})) {
      if (fuidData.company === cm && fuidData.product === pm && fuidData.version === v) {
        return { fuid, data: fuidData };
      }
    }
    return null;
  };

  // Step 1
  const handleCompanySubmit = () => {
    if (!companyName.trim()) return toast.error('Please enter a company name');
    const { companies } = getUniqueCompaniesAndProducts();
    const suggestion = findClosestMatch(companyName.trim(), companies);
    if (suggestion) {
      setSuggestedCompany(suggestion);
      setShowCompanySuggestion(true);
    } else {
      setFinalCompanyName(companyName.trim());
      setFormStep(2);
    }
  };

  const handleCompanySuggestionResponse = (useSuggestion) => {
    setShowCompanySuggestion(false);
    if (useSuggestion) {
      setFinalCompanyName(suggestedCompany);
      setCompanyName(suggestedCompany);
    } else {
      setFinalCompanyName(companyName.trim());
    }
    setFormStep(2);
  };

  // Step 2
  const handleProductSubmit = () => {
    if (!productName.trim()) return toast.error('Please enter a product name');
    const { products } = getUniqueCompaniesAndProducts();
    const suggestion = findClosestMatch(productName.trim(), products);
    if (suggestion) {
      setSuggestedProduct(suggestion);
      setShowProductSuggestion(true);
    } else {
      setFinalProductName(productName.trim());
      // compute existence flags
      const cm = normalized(finalCompanyName || companyName);
      const pm = normalized(productName.trim());
      const existsPair = Object.values(data?.fuid_mappings || {}).some(v => v.company === cm && v.product === pm);
      const existsCompany = Object.values(data?.fuid_mappings || {}).some(v => v.company === cm);
      setCompanyExists(existsCompany);
      setProductExists(existsPair);
      // find any FUID with same company+product, prefer same version if present
      let found = null;
      for (const [f, v] of Object.entries(data?.fuid_mappings || {})) {
        if (v.company === cm && v.product === pm) { found = { fuid: f, data: v }; if ((version||'00').trim() === v.version) break; }
      }
      if (found) { setExistingFuid(found.fuid); setExistingFuidData(found.data); setShowExistingNow(false); setFormStep(3); }
      else { setExistingFuid(null); setExistingFuidData(null); setFormStep(3); }
    }
  };

  const handleProductSuggestionResponse = (useSuggestion) => {
    setShowProductSuggestion(false);
    const chosen = useSuggestion ? suggestedProduct : productName.trim();
    setFinalProductName(chosen);
    const cm2 = normalized(finalCompanyName || companyName);
    const pm2 = normalized(chosen);
    const existsPair2 = Object.values(data?.fuid_mappings || {}).some(v => v.company === cm2 && v.product === pm2);
    const existsCompany2 = Object.values(data?.fuid_mappings || {}).some(v => v.company === cm2);
    setCompanyExists(existsCompany2);
    setProductExists(existsPair2);
    let found2 = null;
    for (const [f, v] of Object.entries(data?.fuid_mappings || {})) {
      if (v.company === cm2 && v.product === pm2) { found2 = { fuid: f, data: v }; if ((version||'00').trim() === v.version) break; }
    }
    if (found2) { setExistingFuid(found2.fuid); setExistingFuidData(found2.data); setShowExistingNow(false); setFormStep(3); }
    else { setExistingFuid(null); setExistingFuidData(null); setFormStep(3); }
  };

  // Step 3 submit (always for approval)
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return toast.error('URL is required');
    if (!shortDescription.trim()) return toast.error('Short description is required');
    setShowApprovalConfirm(true);
  };

  const confirmSendForApproval = () => {
    setSubmitting(true);
    try {
      addNewApplication(
        finalCompanyName,
        finalProductName,
        null,
        url.trim(),
        { shortDescription: shortDescription.trim(), longDescription: longDescription.trim(), categories }
      );
      toast.success('Request submitted for approval');
    } finally {
      setSubmitting(false);
      setShowApprovalConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-flywl-radial flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-flywl-grey-300">Loading FUID generation system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-flywl-radial animate-gradient">
      {/* Header */}
      <div className="bg-flywl-grey-800 border-b border-flywl-grey-700">
        <div className="px-8 py-6">
          <h1 className="text-3xl font-bold text-white">🆕 Generate an ID</h1>
          <p className="text-flywl-grey-300 mt-1">Create unique identifiers for companies and products</p>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {existingFuid ? 'Result' : (formStep === 1 ? 'Step 1: Enter Company Name' : formStep === 2 ? 'Step 2: Enter Product & Version' : 'Step 3: Details')}
                </h3>
                {!existingFuid && (
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3].map(step => (
                      <div key={step} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step < formStep ? 'bg-success-900 text-success-300 border border-success-700' :
                        step === formStep ? 'bg-flywl-orange-900 text-flywl-orange-300 border border-flywl-orange-700' :
                        'bg-flywl-grey-700 text-flywl-grey-400 border border-flywl-grey-600'
                      }`}>
                        {step < formStep ? '✓' : step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card-body">
              {!existingFuid && formStep === 1 && (
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-flywl-grey-200 mb-2">Company Name *</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCompanySubmit()}
                      placeholder="e.g., Microsoft, Google, Amazon"
                      className="input-field flex-1"
                      autoFocus
                    />
                    <button type="button" onClick={handleCompanySubmit} disabled={!companyName.trim()} className="btn-primary px-6">Next →</button>
                  </div>
                </div>
              )}

              {!existingFuid && formStep === 2 && (
                <div>
                  <div className="mb-4 p-3 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                    <p className="text-sm text-flywl-grey-200"><strong>Company:</strong> {finalCompanyName}</p>
                  </div>
                  <label htmlFor="productName" className="block text-sm font-medium text-flywl-grey-200 mb-2">Product Name *</label>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleProductSubmit()}
                      placeholder="e.g., Windows Server 2019, Chrome Browser"
                      className="input-field flex-1"
                      autoFocus
                    />
                    <button type="button" onClick={() => setFormStep(1)} className="btn-secondary px-4">← Back</button>
                    <button type="button" onClick={handleProductSubmit} disabled={!productName.trim()} className="btn-primary px-6">Next →</button>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-flywl-grey-200 mb-1">Version</label>
                    <input className="input-field" value={version} onChange={e=>setVersion(e.target.value)} placeholder="00" />
                  </div>
                </div>
              )}

              {existingFuid && (
                <div className="space-y-4">
                  <div className="p-4 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-flywl-grey-200 text-sm">Existing FUID for <span className="text-white font-semibold">{finalCompanyName}</span> • <span className="text-white font-semibold">{finalProductName}</span> • <span className="text-white font-semibold">{(version||'00').trim()}</span></div>
                      <div className="flex items-center gap-2">
                        {copied ? (
                          <span className="flex items-center text-success-400 text-sm"><CheckCircleIcon className="w-5 h-5 mr-1" />Copied</span>
                        ) : (
                          <CopyToClipboard text={existingFuid} onCopy={() => { setCopied(true); setTimeout(()=>setCopied(false),1500); }}>
                            <button type="button" className="btn-secondary px-3 py-1 text-sm flex items-center"><ClipboardIcon className="w-5 h-5 mr-1" />Copy</button>
                          </CopyToClipboard>
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <code className="text-lg bg-flywl-grey-900 border border-flywl-grey-600 px-4 py-3 rounded text-flywl-orange-400 font-mono block w-full text-center">{existingFuidData?.fuid || (existingFuid?.split('_')[0] || existingFuid)}</code>
                    </div>
                    {existingFuidData && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                        <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Company ID</div><div className="text-white font-medium">{existingFuidData.company_id}</div></div>
                        <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Product ID</div><div className="text-white font-medium">{existingFuidData.product_id}</div></div>
                        <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Version ID</div><div className="text-white font-medium">{existingFuidData.version_id}</div></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!existingFuid && formStep === 3 && (
                <form onSubmit={handleFinalSubmit}>
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                      <p className="text-sm text-flywl-grey-200"><strong>Company:</strong> {finalCompanyName}</p>
                    </div>
                    <div className="p-3 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                      <p className="text-sm text-flywl-grey-200"><strong>Product:</strong> {finalProductName}</p>
                    </div>
                    <div className="p-3 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                      <p className="text-sm text-flywl-grey-200"><strong>Version:</strong> {(version||'00').trim()}</p>
                    </div>
                  </div>

                  {/* If company+product exist but exact FUID not requested yet, show a prompt */}
                  {(companyExists && productExists && existingFuid) && !showExistingNow && (
                    <div className="mb-6 p-4 bg-flywl-grey-900 border border-flywl-grey-600 rounded">
                      <p className="text-flywl-grey-200 mb-2">Company and product exist in our system.</p>
                      <button type="button" className="btn-secondary" onClick={() => setShowExistingNow(true)}>Show FUID</button>
                    </div>
                  )}

                  {showExistingNow && existingFuid && (
                    <div className="mb-6 p-4 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-flywl-grey-200 text-sm">Mapped FUID</div>
                        <div className="flex items-center gap-2">
                          {copied ? (
                            <span className="flex items-center text-success-400 text-sm"><CheckCircleIcon className="w-5 h-5 mr-1" />Copied</span>
                          ) : (
                            <CopyToClipboard text={existingFuid} onCopy={() => { setCopied(true); setTimeout(()=>setCopied(false),1500); }}>
                              <button type="button" className="btn-secondary px-3 py-1 text-sm flex items-center"><ClipboardIcon className="w-5 h-5 mr-1" />Copy</button>
                            </CopyToClipboard>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <code className="text-lg bg-flywl-grey-900 border border-flywl-grey-600 px-4 py-3 rounded text-flywl-orange-400 font-mono block w-full text-center">{existingFuidData?.fuid || (existingFuid?.split('_')[0] || existingFuid)}</code>
                      </div>
                      {existingFuidData && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm">
                          <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Company ID</div><div className="text-white font-medium">{existingFuidData.company_id}</div></div>
                          <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Product ID</div><div className="text-white font-medium">{existingFuidData.product_id}</div></div>
                          <div className="p-2 bg-flywl-grey-900 border border-flywl-grey-700 rounded"><div className="text-flywl-grey-400">Version ID</div><div className="text-white font-medium">{existingFuidData.version_id}</div></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Banner for new company/product */}
                  {(!companyExists || !productExists) && (
                    <div className="mb-4 p-3 bg-flywl-maroon-900 border border-flywl-maroon-700 rounded">
                      <p className="text-flywl-maroon-200 text-sm">
                        {(!companyExists && !productExists) ? `New company "${finalCompanyName}" and product "${finalProductName}" detected.` : (!companyExists ? `New company "${finalCompanyName}" detected.` : `New product "${finalProductName}" detected.`)}
                        {' '}Please provide more details to generate an ID.
                      </p>
                    </div>
                  )}

                  {/* Details form always visible so user can still submit for approval */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-flywl-grey-200 mb-1">URL *</label>
                      <input className="input-field" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-flywl-grey-200 mb-1">Categories</label>
                      <div className="relative">
                        <div ref={fieldRef} className="flex flex-wrap gap-2 p-2 bg-flywl-grey-900 border border-flywl-grey-600 rounded-lg cursor-text" onClick={() => setShowCategoriesDropdown(true)}>
                          {selectedCategories.length === 0 && <span className="text-flywl-grey-400 text-sm">Select categories</span>}
                          {selectedCategories.map(cat => (
                            <span key={cat} className="bg-flywl-orange-900 text-flywl-orange-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                              {cat}
                              <button type="button" onClick={(e) => { e.stopPropagation(); toggleCategory(cat); }} className="text-flywl-orange-300 hover:text-flywl-orange-400">×</button>
                            </span>
                          ))}
                        </div>
                        {showCategoriesDropdown && (
                          <div ref={dropdownRef} className="absolute z-20 mt-1 w-full bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg shadow-flywl p-3">
                            <input
                              className="input-field mb-2"
                              placeholder="Search categories..."
                              value={categorySearch}
                              onChange={e => setCategorySearch(e.target.value)}
                              autoFocus
                            />
                            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                              {filteredCategories.map(cat => (
                                <label key={cat} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-flywl-grey-700 text-sm text-flywl-grey-200">
                                  <input type="checkbox" className="accent-flywl-orange-400" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} />
                                  <span>{cat}</span>
                                </label>
                              ))}
                              <div className="mt-2 border-t border-flywl-grey-700 pt-2">
                                <label className="flex items-center gap-2 px-2 py-1 rounded text-sm text-flywl-grey-200">
                                  <input type="checkbox" className="accent-flywl-orange-400" checked={otherSelected} onChange={toggleOther} />
                                  <span>Other</span>
                                </label>
                                {otherSelected && (
                                  <div className="flex gap-2 mt-2 px-2">
                                    <input className="input-field flex-1" placeholder="Mention category" value={otherCategory} onChange={e=>setOtherCategory(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); applyOtherCategory(); } }} />
                                    <button type="button" onClick={applyOtherCategory} className="btn-primary text-sm">Add</button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end gap-2">
                              <button type="button" onClick={() => { setShowCategoriesDropdown(false); setCategorySearch(''); }} className="btn-secondary text-sm">Close</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-flywl-grey-200 mb-1">Short Description *</label>
                      <input className="input-field" value={shortDescription} onChange={e=>setShortDescription(e.target.value)} placeholder="One-liner" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-flywl-grey-200 mb-1">Long Description</label>
                      <textarea className="input-field min-h-[80px]" value={longDescription} onChange={e=>setLongDescription(e.target.value)} placeholder="Details (optional)" />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button type="button" onClick={() => setFormStep(2)} className="btn-secondary px-4">← Back</button>
                    <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Submitting...' : 'Next'}</button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Company Suggestion Modal */}
          {showCompanySuggestion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg shadow-flywl p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-flywl-orange-500 mr-3" />
                  <h3 className="text-lg font-semibold text-white">Did you mean?</h3>
                </div>
                <p className="text-flywl-grey-300 mb-4">We found a similar company in our database:</p>
                <div className="bg-flywl-grey-900 p-3 rounded-lg mb-6 border border-flywl-grey-600">
                  <p className="text-sm text-flywl-grey-400">You entered:</p>
                  <p className="font-medium text-white">{companyName}</p>
                  <p className="text-sm text-flywl-grey-400 mt-2">Did you mean:</p>
                  <p className="font-medium text-flywl-orange-400">{suggestedCompany}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleCompanySuggestionResponse(true)} className="btn-primary flex-1">Yes, use "{suggestedCompany}"</button>
                  <button onClick={() => handleCompanySuggestionResponse(false)} className="btn-secondary flex-1">No, use "{companyName}"</button>
                </div>
              </div>
            </div>
          )}

          {/* Product Suggestion Modal */}
          {showProductSuggestion && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-flywl-grey-800 border border-flywl-grey-700 rounded-lg shadow-flywl p-6 max-w-md w-full mx-4">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-flywl-orange-500 mr-3" />
                  <h3 className="text-lg font-semibold text-white">Did you mean?</h3>
                </div>
                <p className="text-flywl-grey-300 mb-4">We found a similar product in our database:</p>
                <div className="bg-flywl-grey-900 p-3 rounded-lg mb-6 border border-flywl-grey-600">
                  <p className="text-sm text-flywl-grey-400">You entered:</p>
                  <p className="font-medium text-white">{productName}</p>
                  <p className="text-sm text-flywl-grey-400 mt-2">Did you mean:</p>
                  <p className="font-medium text-flywl-orange-400">{suggestedProduct}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleProductSuggestionResponse(true)} className="btn-primary flex-1">Yes, use "{suggestedProduct}"</button>
                  <button onClick={() => handleProductSuggestionResponse(false)} className="btn-secondary flex-1">No, use "{productName}"</button>
                </div>
              </div>
            </div>
          )}

          {/* Approval Confirmation Modal */}
          {showApprovalConfirm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-flywl-grey-800 border border-flywl-grey-600 rounded-xl shadow-flywl p-6 max-w-lg w-full mx-4">
                <div className="mb-3">
                  <h3 className="text-xl font-semibold text-white">Send for approval</h3>
                  <p className="text-flywl-grey-400 text-sm mt-1">{finalCompanyName} • {finalProductName} • {(version||'00').trim()}</p>
                </div>
                <div className="bg-flywl-grey-900 border border-flywl-grey-700 rounded-lg p-4 mb-5">
                  <p className="text-flywl-grey-200 mb-2">What happens next</p>
                  <ul className="list-disc list-inside space-y-1 text-flywl-grey-300 text-sm">
                    <li>We will review the details you submitted</li>
                    <li>You can track history and status in the <span className="text-white font-medium">Applications</span> tab</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowApprovalConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={confirmSendForApproval} className="btn-primary flex-1">Send for Approval</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LLM Version Extraction UI disabled per spec */}
    </div>
  );
};

export default GeneratePage; 