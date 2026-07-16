import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LeadsPage() {
  const [targets, setTargets] = useState([]);
  const [country, setCountry] = useState('');
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    loadTargets();
    loadLeads();
  }, []);

  async function loadTargets() {
    const { data } = await supabase.from('search_targets').select('*').eq('active', true);
    setTargets(data || []);
  }

  async function loadLeads() {
    const { data } = await supabase.from('leads').select('*').order('found_at', { ascending: false });
    setLeads(data || []);
  }

  const countries = [...new Set(targets.map(t => t.country))];
  const products = [...new Set(targets.filter(t => t.country === country).map(t => t.product))];

  async function handleSearch() {
    const target = targets.find(t => t.country === country && t.product === product);
    if (!target) return alert('Pick a country and product first');

    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/search-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: target.country,
          language: target.language,
          product: target.product,
          keywords: target.keywords,
        }),
      });
      const data = await res.json();
      setResults(data);
      loadLeads();
    } catch (err) {
      setResults({ error: err.message });
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>Agrotechnos Lead Finder</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={country} onChange={e => { setCountry(e.target.value); setProduct(''); }}>
          <option value="">Select Country</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={product} onChange={e => setProduct(e.target.value)} disabled={!country}>
          <option value="">Select Product</option>
          {products.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button onClick={handleSearch} disabled={!country || !product || loading}>
          {loading ? 'Searching...' : 'Search YouTube'}
        </button>
      </div>

      {results && (
        <p>
          {results.error ? `Error: ${results.error}` : `Found ${results.found} new match(es) this search.`}
        </p>
      )}

      <h2>All Leads ({leads.length})</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
            <th>Score</th>
            <th>Author</th>
            <th>Comment</th>
            <th>Country</th>
            <th>Contact Info?</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          {leads.map(lead => (
            <tr key={lead.id} style={{ borderBottom: '1px solid #eee', background: lead.score === 'hot' ? '#ffe8e8' : lead.score === 'warm' ? '#fff8e0' : '#f5f5f5' }}>
              <td>{lead.score}</td>
              <td>{lead.author_name}</td>
              <td style={{ maxWidth: 300 }}>{lead.comment_text}</td>
              <td>{lead.country}</td>
              <td>{lead.has_contact_info ? '✅' : '—'}</td>
              <td><a href={lead.source_url} target="_blank" rel="noreferrer">View</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
