from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
import json
import os
import re
import unicodedata
import requests
import pandas as pd
from datetime import datetime
import sys
import traceback
import numpy as np
from fuzzywuzzy import fuzz
from rag_manager import get_rag_manager, initialize_rag_system
from embedding_manager import EmbeddingManager
import hashlib
import secrets
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from typing import Optional

app = Flask(__name__)
CORS(app)

# Path to the JSON data files (absolute, independent of CWD)
_BASE_DIR = os.path.dirname(__file__)
DATA_FILE = os.path.join(_BASE_DIR, '..', 'company_data.json')
USERS_FILE = os.path.join(_BASE_DIR, '..', 'users.json')
RESETS_FILE = os.path.join(_BASE_DIR, '..', 'password_resets.json')


# Initialize embedding manager (non-blocking)
embedding_manager = None
try:
    from embedding_manager import EmbeddingManager
    embedding_manager = EmbeddingManager()
    print("✅ Embedding manager initialized")
except Exception as e:
    print(f"⚠️  Embedding manager initialization failed (non-critical): {e}")
    # Create a dummy embedding manager to prevent errors
    class DummyEmbeddingManager:
        def generate_all_embeddings(self): return False
        def should_regenerate(self): return False
        def hybrid_search(self, *args, **kwargs): return []
    embedding_manager = DummyEmbeddingManager()

# RAG initialization is now optional and non-blocking
# It will be initialized on-demand when RAG endpoints are called
print("ℹ️  RAG system will initialize on-demand (when first RAG request is made)")

# ------------------------
# Auth helpers
# ------------------------

def _ensure_users_file():
	if not os.path.exists(USERS_FILE):
		with open(USERS_FILE, 'w', encoding='utf-8') as f:
			json.dump({'users': []}, f)


def load_users():
	"""Load users from JSON file"""
	_ensure_users_file()
	with open(USERS_FILE, 'r', encoding='utf-8') as f:
		try:
			data = json.load(f)
			return data.get('users', [])
		except Exception:
			return []


def save_users(users):
	"""Save users to JSON file"""
	_ensure_users_file()
	with open(USERS_FILE, 'w', encoding='utf-8') as f:
		json.dump({'users': users}, f, ensure_ascii=False, indent=2)


def _ensure_resets_file():
	if not os.path.exists(RESETS_FILE):
		with open(RESETS_FILE, 'w', encoding='utf-8') as f:
			json.dump({'resets': {}}, f)

def load_resets():
	_ensure_resets_file()
	with open(RESETS_FILE, 'r', encoding='utf-8') as f:
		try:
			data = json.load(f)
			return data.get('resets', {})
		except Exception:
			return {}

def save_resets(resets):
	_ensure_resets_file()
	with open(RESETS_FILE, 'w', encoding='utf-8') as f:
		json.dump({'resets': resets}, f, ensure_ascii=False, indent=2)


def hash_password(password: str, salt: str = None):
	if not salt:
		salt = secrets.token_hex(16)
	h = hashlib.sha256()
	h.update((salt + password).encode('utf-8'))
	return f'{salt}${h.hexdigest()}'


def verify_password(password: str, stored: str):
	try:
		salt, digest = stored.split('$', 1)
	except ValueError:
		return False
	h = hashlib.sha256()
	h.update((salt + password).encode('utf-8'))
	return h.hexdigest() == digest


# ------------------------
# Existing utilities
# ------------------------

def normalize_text(text):
	"""Normalize text by converting to lowercase, unicode normalization, and removing special characters"""
	if pd.isna(text) or text is None or text == "":
		return ""
	
	text = str(text)
	text = text.lower()
	text = unicodedata.normalize('NFD', text)
	text = re.sub(r'[^\w\s.]', '', text)
	text = re.sub(r'\s+', ' ', text).strip()
	
	return text

def generate_company_id(company_name, counter):
	"""Generate a unique company ID from company name and counter"""
	if not company_name or pd.isna(company_name):
		return f"UNKNOWN{counter:05d}"
	
	cleaned_name = re.sub(r'[^a-zA-Z0-9\s]', ' ', str(company_name))
	words = cleaned_name.split()
	
	first_five_chars = ''.join(words)[:5]
	if not first_five_chars:
		return f"UNKNOWN{counter:05d}"
	
	id_prefix = first_five_chars.upper()
	unique_id = f"{id_prefix}:{counter:05d}"
	
	return unique_id

def generate_product_id(counter):
	"""Generate a unique product ID with 4-digit counter"""
	return f"{counter:04d}"

def generate_version_id(version):
	"""Generate version ID"""
	return str(version)

def generate_fuid(company_id, product_id, version):
	"""Generate FUID in the format FUID-{company_id}-{product_id}-{version}"""
	if pd.isna(version) or not version or str(version).upper() in ["NO VERSION FOUND", "NO VERSION", "NONE", "N/A"]:
		version = "00"
	else:
		version = str(version).replace(" ", "")
	
	return f"FUID-{company_id}-{product_id}-{version}"

def load_data():
	"""Load data from JSON file"""
	try:
		# Print debug info
		print(f"Loading data from: {os.path.abspath(DATA_FILE)}")
		print(f"File exists: {os.path.exists(DATA_FILE)}")
		
		if os.path.exists(DATA_FILE):
			with open(DATA_FILE, 'r', encoding='utf-8') as f:
				data = json.load(f)
			print(f"Loaded {len(data.get('fuid_mappings', {}))} FUIDs from data file")
		else:
			print(f"Warning: Data file not found at {DATA_FILE}, using empty data")
			data = {
				'company_mappings': {},
				'product_mappings': {},
				'version_mappings': {},
				'fuid_mappings': {},
				'company_embeddings': {},
				'product_embeddings': {},
				'next_company_counter': 1,
				'next_product_counter': 1,
				'next_version_counter': 1,
				'next_fuid_counter': 1,
				'total_companies': 0,
				'total_products': 0,
				'total_versions': 0,
				'total_fuids': 0
			}
		# Ensure applications list exists for cross-app approvals
		if 'applications' not in data or not isinstance(data.get('applications'), list):
			data['applications'] = []
		return data
	except Exception as e:
		print(f"Error loading data: {e}")
		import traceback
		traceback.print_exc()
		return {'applications': []}

def save_data(data):
	"""Save data to JSON file"""
	try:
		with open(DATA_FILE, 'w') as f:
			json.dump(data, f, indent=2)
		return True
	except Exception as e:
		print(f"Error saving data: {e}")
		return False

def extract_version_with_ollama(product_name):
	"""Extract version information using Ollama LLM"""
	prompt_template = f"""You are cloud marketplace expert.Extract only the version, year, or level number from the product name. Return ONLY the version/number, nothing else.
If you come across a number that could indicate the year/version/level the product might belong to but 
is not explicitly stated, return the NUMBER ONLY.
If no version exists, return "00"

These are some of the Examples you can use to understand the pattern:
- intellicus bi server v22.1 5 users → 22.1
- dockermaventerraform on windows server2022 → 2022  
- siemonster v5 training non mssps → 5
- windows server 2019 datacenter hardened image level 1 → 2019-level1

Product name: {product_name}
Version: """

	try:
		response = requests.post('http://localhost:11434/api/generate', 
							   json={
								   'model': 'llama3.2',
								   'prompt': prompt_template,
								   'stream': False
							   }, timeout=30)
		
		if response.status_code == 200:
			version = response.json()['response'].strip()
			# If LLM returns "NO VERSION FOUND" or similar, default to "00"
			if version.upper() in ["NO VERSION FOUND", "NO VERSION", "NONE", "N/A", ""]:
				return "00"
			return version
		else:
			return "00"
			
	except Exception as e:
		print(f"Error during version extraction: {e}")
		return "00"

# ------------------------
# Auth endpoints
# ------------------------

EMAIL_REGEX = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')

@app.route('/api/auth/signup', methods=['POST'])
def auth_signup():
	try:
		body = request.get_json(force=True) or {}
		first_name = (body.get('firstName') or '').strip()
		last_name = (body.get('lastName') or '').strip()
		email = (body.get('email') or '').strip()
		organisation = (body.get('organisation') or '').strip()
		password = body.get('password') or ''

		if not EMAIL_REGEX.match(email):
			return jsonify({'error': 'Please enter a valid email address'}), 400
		if len(password) < 8:
			return jsonify({'error': 'Password must be at least 8 characters'}), 400
		if not first_name or not last_name:
			return jsonify({'error': 'First name and last name are required'}), 400

		# Use JSON file storage (primary method)
		users = load_users()
		existing = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
		if existing:
			return jsonify({'error': 'An account with this email already exists'}), 409
		
		password_hash = hash_password(password)
		now_iso = datetime.now().isoformat()
		user = {
			'id': f'USR-{int(datetime.now().timestamp()*1000)}',
			'firstName': first_name,
			'lastName': last_name,
			'email': email,
			'organisation': organisation,
			'passwordHash': password_hash,
			'memberSince': now_iso,
			'lastLogin': now_iso,
			'role': 'User'
		}
		users.append(user)
		save_users(users)
		
		safe = {k: v for k, v in user.items() if k != 'passwordHash'}
		return jsonify({'success': True, 'user': safe})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def auth_login():
	try:
		body = request.get_json(force=True) or {}
		email = (body.get('email') or '').strip()
		password = body.get('password') or ''
		
		# Use JSON file storage
		users = load_users()
		user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
		
		if not user or not verify_password(password, user.get('passwordHash', '')):
			return jsonify({'error': 'Invalid email or password'}), 401
		
		# Update lastLogin
		now_iso = datetime.now().isoformat()
		user['lastLogin'] = now_iso
		
		# Update in JSON file
		users = load_users()
		for u in users:
			if u.get('email', '').lower() == email.lower():
				u['lastLogin'] = now_iso
				break
		save_users(users)
		
		safe = {k: v for k, v in user.items() if k != 'passwordHash'}
		return jsonify({'success': True, 'user': safe})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500


@app.route('/api/auth/profile', methods=['PUT'])
def auth_update_profile():
	try:
		body = request.get_json(force=True) or {}
		email = (body.get('email') or '').strip()
		updates = body.get('updates') or {}
		
		users = load_users()
		updated = None
		for u in users:
			if u.get('email', '').lower() == email.lower():
				u['firstName'] = updates.get('firstName', u.get('firstName'))
				u['lastName'] = updates.get('lastName', u.get('lastName'))
				u['organisation'] = updates.get('organisation', u.get('organisation'))
				updated = u
				break
		if not updated:
			return jsonify({'error': 'User not found'}), 404
		save_users(users)
		safe = {k: v for k, v in updated.items() if k != 'passwordHash'}
		return jsonify({'success': True, 'user': safe})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500


@app.route('/api/auth/change-password', methods=['POST'])
def auth_change_password():
	try:
		body = request.get_json(force=True) or {}
		email = (body.get('email') or '').strip()
		current_password = body.get('currentPassword') or ''
		new_password = body.get('newPassword') or ''
		if len(new_password) < 8:
			return jsonify({'error': 'New password must be at least 8 characters'}), 400
		
		users = load_users()
		user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
		if not user:
			return jsonify({'error': 'User not found'}), 404
		if not verify_password(current_password, user.get('passwordHash', '')):
			return jsonify({'error': 'Current password is incorrect'}), 400
		user['passwordHash'] = hash_password(new_password)
		save_users(users)
		return jsonify({'success': True})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

@app.route('/api/auth/forgot-password', methods=['POST'])
def auth_forgot_password():
	try:
		body = request.get_json(force=True) or {}
		email = (body.get('email') or '').strip()
		if not EMAIL_REGEX.match(email):
			return jsonify({'error': 'Please enter a valid email address'}), 400
		users = load_users()
		user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
		# For security, do not reveal whether the user exists
		token = secrets.token_urlsafe(32)
		resets = load_resets()
		# Expire in 30 minutes
		expires_at = (datetime.now().timestamp() + 30*60)
		if user:
			resets[token] = {
				'email': user['email'],
				'expires_at': expires_at
			}
			save_resets(resets)
		# Build a reset link pointing to frontend with token param
		# Use the referrer or default to localhost; front-end will route by query param
		frontend_origin = request.headers.get('Origin') or 'http://localhost:3000'
		reset_link = f"{frontend_origin}/?reset_token={token}"
		return jsonify({'success': True, 'message': 'If that email exists, a reset link has been generated.', 'reset_link': reset_link})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def auth_reset_password():
	try:
		body = request.get_json(force=True) or {}
		token = body.get('token') or ''
		new_password = body.get('newPassword') or ''
		if len(new_password) < 8:
			return jsonify({'error': 'New password must be at least 8 characters'}), 400
		resets = load_resets()
		entry = resets.get(token)
		if not entry:
			return jsonify({'error': 'Invalid or expired token'}), 400
		if datetime.now().timestamp() > float(entry.get('expires_at', 0)):
			# Expired
			resets.pop(token, None)
			save_resets(resets)
			return jsonify({'error': 'Invalid or expired token'}), 400
		email = entry.get('email')
		users = load_users()
		user = next((u for u in users if u.get('email', '').lower() == email.lower()), None)
		if not user:
			return jsonify({'error': 'User not found'}), 404
		user['passwordHash'] = hash_password(new_password)
		save_users(users)
		# Invalidate token
		resets.pop(token, None)
		save_resets(resets)
		return jsonify({'success': True})
	except Exception as e:
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

# ------------------------
# Existing endpoints (health, data, fuid, rag, etc.)
# ------------------------

@app.route('/api/health', methods=['GET'])
def health_check():
	"""Health check endpoint"""
	return jsonify({
		'status': 'healthy', 
		'timestamp': datetime.now().isoformat(),
		'message': 'ID Management System API is running'
	})

@app.route('/api/data', methods=['GET'])
def get_data():
	"""Get all data from JSON file"""
	try:
		data = load_data()
		
		# Calculate correct totals from actual mappings
		fuid_mappings = data.get('fuid_mappings', {})
		
		# Extract unique companies, products, and versions from fuid_mappings
		unique_companies = set()
		unique_products = set()
		unique_versions = set()
		
		for fuid_data in fuid_mappings.values():
			if 'company' in fuid_data:
				unique_companies.add(fuid_data['company'])
			if 'product' in fuid_data:
				unique_products.add(fuid_data['product'])
			if 'version' in fuid_data:
				unique_versions.add(fuid_data['version'])
		
		# Update totals with correct calculations
		data['total_companies'] = len(unique_companies)
		data['total_products'] = len(unique_products)
		data['total_fuids'] = len(fuid_mappings)
		data['total_versions'] = len(unique_versions)
		
		# Add last_updated timestamp
		if os.path.exists(DATA_FILE):
			mod_time = os.path.getmtime(DATA_FILE)
			data['last_updated'] = datetime.fromtimestamp(mod_time).isoformat()
		
		return jsonify(data)
	except Exception as e:
		return jsonify({'error': str(e)}), 500

@app.route('/api/data', methods=['POST'])
def save_data_endpoint():
	try:
		payload = request.get_json(force=True)
		# Persist to file
		saved = save_data(payload)
		return jsonify({'success': saved})
	except Exception as e:
		return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
	"""Get database statistics"""
	try:
		data = load_data()
		
		# Calculate totals from actual mappings instead of stored values
		fuid_mappings = data.get('fuid_mappings', {})
		
		# Extract unique companies and products from fuid_mappings
		unique_companies = set()
		unique_products = set()
		
		for fuid_data in fuid_mappings.values():
			if 'company' in fuid_data:
				unique_companies.add(fuid_data['company'])
			if 'product' in fuid_data:
				unique_products.add(fuid_data['product'])
		
		# Calculate totals
		total_companies = len(unique_companies)
		total_products = len(unique_products)
		total_fuids = len(fuid_mappings)
		
		stats = {
			'total_companies': total_companies,
			'total_products': total_products,
			'total_fuids': total_fuids,
			'last_updated': None
		}
		
		if os.path.exists(DATA_FILE):
			mod_time = os.path.getmtime(DATA_FILE)
			stats['last_updated'] = datetime.fromtimestamp(mod_time).isoformat()
		
		return jsonify(stats)
	except Exception as e:
		return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_database():
	"""New search API with support for ID, auto-suggest, and direct search"""
	try:
		query = request.json.get('query', '')
		search_type = request.json.get('search_type', None)  # 'company', 'product', or None
		selected_item = request.json.get('selected_item', None)  # For auto-suggest selections
		k_val = request.json.get('k_val', 100)  # Number of results to return
		platform_filter = request.json.get('platform_filter', 'All')  # Platform filter
		
		if not query:
			return jsonify({'results': []})
		
		data = load_data()
		
		# Use the new search logic
		results = run_new_search(query, data, search_type, selected_item, k_val, platform_filter)
		
		return jsonify({'results': results})
	except Exception as e:
		return jsonify({'error': str(e)}), 500



def _cosine_sim(vec1, vec2):
	"""Calculate cosine similarity between two vectors"""
	try:
		dot_product = np.dot(vec1, vec2)
		norm_a = np.linalg.norm(vec1)
		norm_b = np.linalg.norm(vec2)
		if norm_a == 0 or norm_b == 0:
			return 0.0
		return dot_product / (norm_a * norm_b)
	except:
		return 0.0

def run_new_search(query: str, data, search_type=None, selected_item=None, k_val=100, platform_filter='All'):
	"""New search function implementing the updated requirements"""
	import re
	import unicodedata
	from fuzzywuzzy import fuzz
	
	def normalize_text(text):
		"""Normalize text using the same logic as the frontend"""
		if not text or text is None:
			return ""
		
		text = str(text).lower()
		text = unicodedata.normalize('NFD', text)
		text = re.sub(r'[^\w\s.]', '', text)
		text = re.sub(r'\s+', ' ', text).strip()
		
		return text
	
	def calculate_fuzzy_score(query, target):
		"""Calculate fuzzy score using fuzzywuzzy"""
		return fuzz.ratio(query.lower(), target.lower())
	
	def find_closest_match(query, data):
		"""Find closest match in the data"""
		normalized_query = normalize_text(query).lower()
		best_match = ''
		best_score = 0
		
		fuid_mappings = data.get('fuid_mappings', {})
		all_terms = set()
		
		for details in fuid_mappings.values():
			if details.get('company'):
				all_terms.add(details['company'].lower())
			if details.get('product'):
				all_terms.add(details['product'].lower())
		
		for term in all_terms:
			score = calculate_fuzzy_score(normalized_query, term)
			if score > best_score:
				best_score = score
				best_match = term
		
		return best_match
	
	results = []
	fuid_mappings = data.get('fuid_mappings', {})
	
	# 1. FUID exact match search
	if query.upper().startswith('FUID'):
		for details in fuid_mappings.values():
			fuid = details.get('fuid', '')
			if query.upper() == fuid.upper():
				results.append({
					'type': 'FUID Match',
					'fuid': fuid,
					'company': details.get('company', ''),
					'company_id': details.get('company_id', ''),
					'product': details.get('product', ''),
					'product_id': details.get('product_id', ''),
					'version': details.get('version', ''),
					'version_id': details.get('version_id', ''),
					'url': details.get('url', ''),
					'categories': details.get('categories', ''),
					'platform': details.get('platform', ''),
					'relevance_score': 100.0,
					'fuzzy_similarity': 100.0
				})
		return results
	
	# 2. Auto-suggest selections
	if search_type == 'company' and selected_item:
		company_products = []
		for details in fuid_mappings.values():
			if details.get('company', '').lower() == selected_item.lower():
				platform = details.get('platform', '')
				if platform_filter != 'All' and platform.upper() != platform_filter.upper():
					continue
					
				company_products.append({
					'type': 'Company Match',
					'fuid': details.get('fuid', ''),
					'company': details.get('company', ''),
					'company_id': details.get('company_id', ''),
					'product': details.get('product', ''),
					'product_id': details.get('product_id', ''),
					'version': details.get('version', ''),
					'version_id': details.get('version_id', ''),
					'url': details.get('url', ''),
					'categories': details.get('categories', ''),
					'platform': platform,
					'relevance_score': 100.0,
					'fuzzy_similarity': 100.0
				})
		
		# Sort alphabetically by product name
		return sorted(company_products, key=lambda x: x['product'].lower())[:k_val]
	
	if search_type == 'product' and selected_item:
		product_matches = []
		for details in fuid_mappings.values():
			if details.get('product'):
				platform = details.get('platform', '')
				if platform_filter != 'All' and platform.upper() != platform_filter.upper():
					continue
				
				fuzzy_score = calculate_fuzzy_score(selected_item.lower(), details['product'].lower())
				if fuzzy_score > 0:
					product_matches.append({
						'type': 'Product Match',
						'fuid': details.get('fuid', ''),
						'company': details.get('company', ''),
						'company_id': details.get('company_id', ''),
						'product': details.get('product', ''),
						'product_id': details.get('product_id', ''),
						'version': details.get('version', ''),
						'version_id': details.get('version_id', ''),
						'url': details.get('url', ''),
						'categories': details.get('categories', ''),
						'platform': platform,
						'relevance_score': fuzzy_score,
						'fuzzy_similarity': fuzzy_score
					})
		
		# Sort by fuzzy score (highest first)
		return sorted(product_matches, key=lambda x: x['relevance_score'], reverse=True)[:k_val]
	
	# 3. Direct search with normalization
	normalized_query = normalize_text(query).lower().strip()
	
	if len(normalized_query) < 2:
		return results
	
	# Check for exact matches first
	exact_match_found = False
	for details in fuid_mappings.values():
		normalized_company = normalize_text(details.get('company', '')).lower()
		normalized_product = normalize_text(details.get('product', '')).lower()
		
		if normalized_query == normalized_company or normalized_query == normalized_product:
			exact_match_found = True
			break
	
	if exact_match_found:
		# Check if the query exactly matches a company name or product name
		exact_company_match = None
		exact_product_match = None
		
		for details in fuid_mappings.values():
			normalized_company = normalize_text(details.get('company', '')).lower()
			normalized_product = normalize_text(details.get('product', '')).lower()
			
			if normalized_query == normalized_company:
				exact_company_match = details.get('company')
			if normalized_query == normalized_product:
				exact_product_match = details.get('product')
		
		# If exact company match, show all products from that company (like auto-suggest)
		if exact_company_match:
			for details in fuid_mappings.values():
				if details.get('company', '').lower() == exact_company_match.lower():
					platform = details.get('platform', '')
					if platform_filter != 'All' and platform.upper() != platform_filter.upper():
						continue
						
					results.append({
						'type': 'Company Match',
						'fuid': details.get('fuid', ''),
						'company': details.get('company', ''),
						'company_id': details.get('company_id', ''),
						'product': details.get('product', ''),
						'product_id': details.get('product_id', ''),
						'version': details.get('version', ''),
						'version_id': details.get('version_id', ''),
						'url': details.get('url', ''),
						'categories': details.get('categories', ''),
						'platform': platform,
						'relevance_score': 100.0,
						'fuzzy_similarity': 100.0
					})
			
			# Sort alphabetically by product name (same as auto-suggest)
			return sorted(results, key=lambda x: x['product'].lower())[:k_val]
		
		# If exact product match, use fuzzy scoring for that product
		if exact_product_match:
			for details in fuid_mappings.values():
				if details.get('product'):
					platform = details.get('platform', '')
					if platform_filter != 'All' and platform.upper() != platform_filter.upper():
						continue
					
					fuzzy_score = calculate_fuzzy_score(normalized_query, details['product'].lower())
					if fuzzy_score > 80:  # High threshold for exact product matches
						results.append({
							'type': 'Product Match',
							'fuid': details.get('fuid', ''),
							'company': details.get('company', ''),
							'company_id': details.get('company_id', ''),
							'product': details.get('product', ''),
							'product_id': details.get('product_id', ''),
							'version': details.get('version', ''),
							'version_id': details.get('version_id', ''),
							'url': details.get('url', ''),
							'categories': details.get('categories', ''),
							'platform': platform,
							'relevance_score': float(fuzzy_score),
							'fuzzy_similarity': float(fuzzy_score)
						})
			
			return sorted(results, key=lambda x: x['relevance_score'], reverse=True)[:k_val]
	else:
		# No exact match found - find closest match and return results for it
		closest_match = find_closest_match(query, data)
		
		if closest_match:
			# Check if the closest match is a company or product name
			is_closest_match_company = False
			is_closest_match_product = False
			
			for details in fuid_mappings.values():
				normalized_company = normalize_text(details.get('company', '')).lower()
				normalized_product = normalize_text(details.get('product', '')).lower()
				
				if closest_match == normalized_company:
					is_closest_match_company = True
				if closest_match == normalized_product:
					is_closest_match_product = True
			
			# If closest match is a company, show all products from that company
			if is_closest_match_company:
				for details in fuid_mappings.values():
					normalized_company = normalize_text(details.get('company', '')).lower()
					if normalized_company == closest_match:
						platform = details.get('platform', '')
						if platform_filter != 'All' and platform.upper() != platform_filter.upper():
							continue
							
						# Calculate fuzzy score for closest match
						fuzzy_score = calculate_fuzzy_score(query, details.get('product', ''))
						results.append({
							'type': 'Closest Match',
							'fuid': details.get('fuid', ''),
							'company': details.get('company', ''),
							'company_id': details.get('company_id', ''),
							'product': details.get('product', ''),
							'product_id': details.get('product_id', ''),
							'version': details.get('version', ''),
							'version_id': details.get('version_id', ''),
							'url': details.get('url', ''),
							'categories': details.get('categories', ''),
							'platform': platform,
							'relevance_score': float(fuzzy_score),
							'fuzzy_similarity': float(fuzzy_score),
							'closest_match': closest_match,
							'original_query': query
						})
				
				# Sort alphabetically by product name (same as company match)
				return sorted(results, key=lambda x: x['product'].lower())[:k_val]
			
			# If closest match is a product, show fuzzy matches for that product
			if is_closest_match_product:
				for details in fuid_mappings.values():
					if details.get('product'):
						platform = details.get('platform', '')
						if platform_filter != 'All' and platform.upper() != platform_filter.upper():
							continue
						
					fuzzy_score = calculate_fuzzy_score(closest_match, details['product'].lower())
					if fuzzy_score > 80:
						results.append({
							'type': 'Closest Match',
							'fuid': details.get('fuid', ''),
							'company': details.get('company', ''),
							'company_id': details.get('company_id', ''),
							'product': details.get('product', ''),
							'product_id': details.get('product_id', ''),
							'version': details.get('version', ''),
							'version_id': details.get('version_id', ''),
							'url': details.get('url', ''),
							'categories': details.get('categories', ''),
							'platform': platform,
							'relevance_score': float(fuzzy_score),
							'fuzzy_similarity': float(fuzzy_score),
							'closest_match': closest_match,
							'original_query': query
						})
				
				return sorted(results, key=lambda x: x['relevance_score'], reverse=True)[:k_val]
	
	return results

def run_unified_search(canonical_query: str, k_val: int, platform_filter: str, data):
	"""Unified search function that matches query against all products with proper scoring"""
	
	# Use the existing embedding manager's hybrid search for efficiency
	try:
		# Get embedding-based results first
		embedding_matches = embedding_manager.hybrid_search(
			query=canonical_query,
			search_type='product',
			threshold=0.0,  # No threshold - get all results
			top_k=min(k_val * 3, 300)  # Get more results than needed for filtering
		)
		
		if embedding_matches:
			# Convert embedding matches to our result format
			fuid_mappings = data.get('fuid_mappings', {})
			results = []
			
			for match in embedding_matches:
				matched_product_name = match['name']
				
				# Find all FUIDs for this product
				for entry_id, details in fuid_mappings.items():
					product_name = details.get('product', '')
					if product_name.lower() == matched_product_name.lower():
						platform = details.get('platform', '')
						
						# Apply platform filter
						if platform_filter != "All" and platform.upper() != platform_filter.upper():
							continue
						
						# Use the hybrid score from embedding manager
						result = {
							'type': 'Product Match',
							'fuid': details.get('fuid', ''),
							'company': details.get('company', ''),
							'company_id': details.get('company_id', ''),
							'product': product_name,
							'product_id': details.get('product_id', ''),
							'version': details.get('version', ''),
							'version_id': details.get('version_id', ''),
							'url': details.get('url', ''),
							'categories': details.get('categories', ''),
							'platform': platform,
							'relevance_score': match['hybrid_score'],
							'embedding_similarity': match['embedding_similarity'],
							'fuzzy_similarity': match['fuzzy_similarity']
						}
						
						results.append(result)
			
			# Sort by relevance score and return top k_val results
			results_sorted = sorted(results, key=lambda x: x["relevance_score"], reverse=True)[:k_val]
			return results_sorted
			
	except Exception as e:
		print(f"Error in embedding-based search: {e}")
	
	# Fallback to fuzzy matching only if embeddings fail
	fuid_mappings = data.get('fuid_mappings', {})
	results = []
	
	for entry_id, details in fuid_mappings.items():
		product_name = details.get('product', '')
		platform = details.get('platform', '')
		
		# Skip empty products
		if not product_name or len(product_name.strip()) < 2:
			continue
		
		# Apply platform filter
		if platform_filter != "All" and platform.upper() != platform_filter.upper():
			continue
		
		# Calculate fuzzy similarity
		fuzzy = fuzz.ratio(canonical_query.lower(), product_name.lower()) / 100.0
		
		# Only include results with some similarity
		if fuzzy > 0.1:  # 10% minimum similarity
			result = {
				'type': 'Product Match',
				'fuid': details.get('fuid', ''),
				'company': details.get('company', ''),
				'company_id': details.get('company_id', ''),
				'product': product_name,
				'product_id': details.get('product_id', ''),
				'version': details.get('version', ''),
				'version_id': details.get('version_id', ''),
				'url': details.get('url', ''),
				'categories': details.get('categories', ''),
				'platform': platform,
				'relevance_score': fuzzy,
				'embedding_similarity': None,
				'fuzzy_similarity': fuzzy
			}
			
			results.append(result)
	
	# Sort by relevance score and return top k_val results
	results_sorted = sorted(results, key=lambda x: x["relevance_score"], reverse=True)[:k_val]
	return results_sorted



@app.route('/api/generate-embeddings', methods=['POST'])
def generate_embeddings():
	"""Manually trigger embedding generation"""
	try:
		if embedding_manager and hasattr(embedding_manager, 'generate_all_embeddings'):
			success = embedding_manager.generate_all_embeddings()
			if success:
				return jsonify({'success': True, 'message': 'Embeddings generated successfully'})
			else:
				return jsonify({'success': False, 'message': 'Failed to generate embeddings'}), 500
		else:
			return jsonify({'success': False, 'message': 'Embedding manager not available'}), 500
	except Exception as e:
		return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/embedding-status', methods=['GET'])
def embedding_status():
	"""Get embedding generation status"""
	try:
		if embedding_manager and hasattr(embedding_manager, 'should_regenerate'):
			should_regenerate = embedding_manager.should_regenerate()
			
			# Get metadata if available
			metadata = {}
			if hasattr(embedding_manager, 'metadata_file') and os.path.exists(embedding_manager.metadata_file):
				with open(embedding_manager.metadata_file, 'r') as f:
					metadata = json.load(f)
			
			return jsonify({
				'should_regenerate': should_regenerate,
				'metadata': metadata
			})
		else:
			return jsonify({
				'should_regenerate': True,
				'metadata': {},
				'note': 'Embedding manager not available'
			})
	except Exception as e:
		return jsonify({'error': str(e)}), 500

@app.route('/api/extract-version', methods=['POST'])
def extract_version():
	"""Extract version from product name using Ollama"""
	try:
		product_name = request.json.get('product_name', '')
		if not product_name:
			return jsonify({'version': '00'})
		
		version = extract_version_with_ollama(product_name)
		return jsonify({'version': version})
	except Exception as e:
		return jsonify({'version': '00', 'error': str(e)})

@app.route('/api/generate-fuid', methods=['POST'])
def generate_fuid_endpoint():
	"""Generate a new FUID"""
	try:
		company_name = request.json.get('company_name', '')
		product_name = request.json.get('product_name', '')
		
		if not company_name or not product_name:
			return jsonify({'error': 'Both company name and product name are required'}), 400
		
		# Load existing data
		data = load_data()
		
		company_mappings = data.get('company_mappings', {})
		product_mappings = data.get('product_mappings', {})
		version_mappings = data.get('version_mappings', {})
		fuid_mappings = data.get('fuid_mappings', {})
		company_embeddings = data.get('company_embeddings', {})
		product_embeddings = data.get('product_embeddings', {})
		
		company_counter = data.get('next_company_counter', 1)
		product_counter = data.get('next_product_counter', 1)
		version_counter = data.get('next_version_counter', 1)
		fuid_counter = data.get('next_fuid_counter', 1)
		
		# Step 1: Normalize names
		normalized_company = normalize_text(company_name)
		normalized_product = normalize_text(product_name)
		
		# Step 2: Version handling (explicit input)
		# NOTE: LLM-based extraction disabled per new spec.
		# version = extract_version_with_ollama(normalized_product)
		version = (request.json.get('version') or '').strip() or "00"
		
		# Step 2.5: Check if exact FUID already exists for this company-product-version combination
		existing_fuid = None
		for fuid, fuid_data in fuid_mappings.items():
			if (fuid_data.get('company') == normalized_company and 
				fuid_data.get('product') == normalized_product and 
				fuid_data.get('version') == version):
				existing_fuid = fuid
				existing_fuid_data = fuid_data
				break
		
		# If exact FUID exists, return it immediately
		if existing_fuid:
			result = {
				'fuid': existing_fuid,
				'company': {
					'name': company_name,
					'normalized': normalized_company,
					'id': existing_fuid_data.get('company_id'),
					'status': 'Existing'
				},
				'product': {
					'name': product_name,
					'normalized': normalized_product,
					'id': existing_fuid_data.get('product_id'),
					'status': 'Existing'
				},
				'version': {
					'version': version,
					'id': existing_fuid_data.get('version_id')
				},
				'fuid_status': 'Existing',
				'updated_data': data  # Return existing data without changes
			}
			return jsonify(result)
		
		# Step 3: Check if company exists (check both company_mappings and fuid_mappings)
		company_exists = normalized_company in company_mappings
		
		if not company_exists:
			# Also check if company exists in fuid_mappings
			for fuid_data in fuid_mappings.values():
				if fuid_data.get('company') == normalized_company:
					# Company exists in fuid_mappings, extract its ID
					existing_company_id = fuid_data.get('company_id')
					if existing_company_id:
						company_mappings[normalized_company] = existing_company_id
						company_exists = True
						company_id = existing_company_id
						break
		
		if company_exists:
			company_id = company_mappings[normalized_company]
		else:
			company_id = generate_company_id(normalized_company, company_counter)
			company_mappings[normalized_company] = company_id
			product_mappings[normalized_company] = {}
			company_counter += 1
		
		# Step 4: Check if product exists (check both product_mappings and fuid_mappings)
		product_exists = False
		
		if normalized_company in product_mappings and normalized_product in product_mappings[normalized_company]:
			product_id = product_mappings[normalized_company][normalized_product]
			product_exists = True
		else:
			# Also check if product exists in fuid_mappings for this company
			for fuid_data in fuid_mappings.values():
				if (fuid_data.get('company') == normalized_company and 
					fuid_data.get('product') == normalized_product):
					# Product exists in fuid_mappings, extract its ID
					existing_product_id = fuid_data.get('product_id')
					if existing_product_id:
						if normalized_company not in product_mappings:
							product_mappings[normalized_company] = {}
						product_mappings[normalized_company][normalized_product] = existing_product_id
						product_exists = True
						product_id = existing_product_id
						break
			
			if not product_exists:
				if normalized_company not in product_mappings:
					product_mappings[normalized_company] = {}
				
				product_id = generate_product_id(product_counter)
				product_mappings[normalized_company][normalized_product] = product_id
				product_counter += 1
		
		# Step 5: Handle version
		if normalized_company not in version_mappings:
			version_mappings[normalized_company] = {}
		if normalized_product not in version_mappings[normalized_company]:
			version_mappings[normalized_company][normalized_product] = {}
		
		if version not in version_mappings[normalized_company][normalized_product]:
			version_id = generate_version_id(version)
			version_mappings[normalized_company][normalized_product][version] = version_id
			version_counter += 1
		else:
			version_id = version_mappings[normalized_company][normalized_product][version]
		
		# Step 6: Generate FUID
		fuid = generate_fuid(company_id, product_id, version)
		
		# Check if FUID already exists
		fuid_exists = fuid in fuid_mappings
		
		if not fuid_exists:
			fuid_mappings[fuid] = {
				"company": normalized_company,
				"company_id": company_id,
				"product": normalized_product,
				"product_id": product_id,
				"version": version,
				"version_id": version_id
			}
			fuid_counter += 1
		
		# Step 7: Save data
		updated_data = {
			'fuid_mappings': fuid_mappings,
			'company_mappings': company_mappings,
			'product_mappings': product_mappings,
			'version_mappings': version_mappings,
			'company_embeddings': company_embeddings,
			'product_embeddings': product_embeddings,
			'next_fuid_counter': fuid_counter,
			'next_company_counter': company_counter,
			'next_product_counter': product_counter,
			'next_version_counter': version_counter,
			'total_fuids': len(fuid_mappings),
			'total_companies': len(company_mappings),
			'total_products': sum(len(products) for products in product_mappings.values()),
			'total_versions': sum(len(versions) for products in version_mappings.values() for versions in products.values())
		}
		
		save_data(updated_data)
		
		# Return result
		result = {
			'fuid': fuid,
			'company': {
				'name': company_name,
				'normalized': normalized_company,
				'id': company_id,
				'status': 'Existing' if company_exists else 'New'
			},
			'product': {
				'name': product_name,
				'normalized': normalized_product,
				'id': product_id,
				'status': 'Existing' if product_exists else 'New'
			},
			'version': {
				'version': version,
				'id': version_id
			},
			'fuid_status': 'Existing' if fuid_exists else 'New',
			'updated_data': updated_data
		}
		
		return jsonify(result)
		
	except Exception as e:
		print(f"Error generating FUID: {e}")
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

# RAG Chat Endpoints
@app.route('/api/rag/initialize', methods=['POST'])
def initialize_rag():
	"""Initialize RAG by PRE-GENERATING embeddings for ALL products and storing in ChromaDB.
	
	This generates embeddings ONCE and stores them locally. No on-demand generation.
	"""
	try:
		from rag_manager import get_rag_manager, initialize_rag_system
		
		# Initialize RAG manager
		rag_manager = get_rag_manager()
		
		# Check if ChromaDB is available
		if not rag_manager.collection:
			return jsonify({
				'success': False,
				'error': 'ChromaDB not available. Check server logs for initialization errors.',
				'chunk_count': 0,
				'product_ids': []
			}), 500
		
		# Prepare embeddings (PRE-GENERATE for all products with descriptions)
		# This will skip if embeddings already exist (unless force_regenerate=True)
		try:
			logger.info("Starting embedding generation for all products...")
			chunk_count = rag_manager.prepare_product_embeddings(force_regenerate=False)
			preloaded_ids = getattr(rag_manager, 'preloaded_product_fuids', [])
			
			if chunk_count > 0:
				logger.info(f"✅ Successfully pre-generated {chunk_count} chunks for {len(preloaded_ids)} products")
				return jsonify({
					'success': True,
					'message': f'RAG initialized successfully with {chunk_count} pre-generated chunks across {len(preloaded_ids)} products',
					'chunk_count': chunk_count,
					'product_count': len(preloaded_ids),
					'product_ids': preloaded_ids
				})
			else:
				# Check if it's because embeddings already exist
				if len(preloaded_ids) > 0:
					return jsonify({
						'success': True,
						'message': f'RAG already initialized with {len(preloaded_ids)} products',
						'chunk_count': chunk_count,
						'product_count': len(preloaded_ids),
						'product_ids': preloaded_ids,
						'note': 'Embeddings already exist in ChromaDB'
					})
				else:
					return jsonify({
						'success': False,
						'error': 'No products with descriptions found, or Ollama is not running',
						'chunk_count': 0,
						'product_ids': [],
						'warning': 'Make sure Ollama is running and products have longDescription fields'
					}), 500
				
		except Exception as emb_error:
			# If embedding generation fails (e.g., Ollama not running)
			logger.error(f"Embedding generation failed: {emb_error}")
			traceback.print_exc()
			return jsonify({
				'success': False,
				'error': f'Failed to generate embeddings: {str(emb_error)}',
				'chunk_count': 0,
				'product_ids': [],
				'warning': 'Ollama may not be running. Start Ollama and try again.'
			}), 500
		
	except Exception as e:
		logger.error(f"Error initializing RAG: {e}")
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

@app.route('/api/rag/chat', methods=['POST'])
def rag_chat():
	"""Handle RAG chat queries for specific products"""
	try:
		data = request.get_json()
		
		if not data:
			return jsonify({'error': 'No JSON data provided'}), 400
		
		query = data.get('query', '').strip()
		product_fuid = data.get('product_fuid', '').strip()
		conversation_history = data.get('conversation_history', [])
		
		if not query:
			return jsonify({'error': 'Query is required'}), 400
		
		if not product_fuid:
			return jsonify({'error': 'Product FUID is required'}), 400
		
		# Get RAG manager (will initialize on first call if needed)
		try:
			rag_manager = get_rag_manager()
			result = rag_manager.chat_with_product(query, product_fuid, conversation_history)
			return jsonify(result)
		except Exception as rag_error:
			# If RAG fails (e.g., Ollama not running), return helpful error
			return jsonify({
				'error': 'RAG service unavailable. Please ensure Ollama is running.',
				'details': str(rag_error),
				'success': False
			}), 503
		
	except Exception as e:
		print(f"Error in RAG chat: {e}")
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

@app.route('/api/rag/chat/stream', methods=['POST'])
def rag_chat_stream():
	"""Handle streaming RAG chat queries for specific products"""
	try:
		data = request.get_json()
		
		if not data:
			return jsonify({'error': 'No JSON data provided'}), 400
		
		query = data.get('query', '').strip()
		product_fuid = data.get('product_fuid', '').strip()
		conversation_history = data.get('conversation_history', [])
		
		if not query:
			return jsonify({'error': 'Query is required'}), 400
		
		if not product_fuid:
			return jsonify({'error': 'Product FUID is required'}), 400
		
		# Get RAG manager
		rag_manager = get_rag_manager()
		
		# Check if ChromaDB is available
		if not rag_manager.collection:
			def error_stream():
				yield f"data: {json.dumps({'error': 'RAG system not initialized. Please initialize RAG first by calling /api/rag/initialize'})}\n\n"
			return Response(error_stream(), mimetype='text/plain')
		
		# Retrieve pre-generated chunks from ChromaDB filtered by FUID
		# This does NOT generate new embeddings - only retrieves existing ones
		context_chunks = rag_manager.get_relevant_context(query, product_fuid, top_k=3)
		
		if not context_chunks:
			# Check if product exists but has no embeddings
			product_exists = False
			if hasattr(rag_manager, 'fuid_mappings') and product_fuid in rag_manager.fuid_mappings:
				product_exists = True
				long_desc = rag_manager.fuid_mappings[product_fuid].get('longDescription', '')
				if not long_desc or len(long_desc) < 50:
					error_msg = 'This product does not have enough description data for RAG chat.'
				else:
					error_msg = f'No embeddings found for this product. Please initialize RAG by calling /api/rag/initialize to generate embeddings.'
			else:
				error_msg = 'Product not found in database.'
			
			def error_stream():
				yield f"data: {json.dumps({'error': error_msg})}\n\n"
			return Response(error_stream(), mimetype='text/plain')
		
		def generate():
			# Send context info first
			yield f"data: {json.dumps({'context_used': context_chunks})}\n\n"
			
			# Stream the response
			full_response = ""
			for chunk in rag_manager.stream_response(query, product_fuid, context_chunks, conversation_history):
				full_response += chunk
				yield f"data: {json.dumps({'chunk': chunk, 'full_response': full_response})}\n\n"
			
			# Send completion signal
			yield f"data: {json.dumps({'done': True, 'full_response': full_response})}\n\n"
		
		return Response(generate(), mimetype='text/plain', headers={
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*'
		})
		
	except Exception as e:
		print(f"Error in streaming RAG chat: {e}")
		traceback.print_exc()
		def error_stream():
			yield f"data: {json.dumps({'error': str(e)})}\n\n"
		return Response(error_stream(), mimetype='text/plain')

@app.route('/api/rag/product-info/<product_fuid>', methods=['GET'])
def get_rag_product_info(product_fuid):
	"""Get product information for RAG chat context"""
	try:
		rag_manager = get_rag_manager()
		product_info = rag_manager.get_product_info(product_fuid)
		
		if not product_info:
			return jsonify({'error': 'Product not found'}), 404
		
		return jsonify({
			'success': True,
			'product_info': product_info
		})
		
	except Exception as e:
		print(f"Error getting product info: {e}")
		traceback.print_exc()
		return jsonify({'error': str(e)}), 500

@app.route('/api/rag/status', methods=['GET'])
def rag_status():
	"""Get RAG system status (Chroma preloaded mode)"""
	try:
		rag_manager = get_rag_manager()
		
		# Load data if not already loaded (non-blocking)
		if not hasattr(rag_manager, 'fuid_mappings') or len(rag_manager.fuid_mappings) == 0:
			try:
				with open(rag_manager.data_file_path, 'r', encoding='utf-8') as f:
					data = json.load(f)
				rag_manager.fuid_mappings = data.get('fuid_mappings', {})
			except Exception as e:
				logger.warning(f"Could not load data for RAG status: {e}")
		
		# Report preloaded product ids
		pre_ids = getattr(rag_manager, 'preloaded_product_fuids', [])
		embeddings_ready = len(pre_ids) > 0
		total_products = len(pre_ids)
		
		# Check if models are loaded (may fail if Ollama not running)
		models_loaded = {
			'embedding_model': False,
			'llm': False
		}
		try:
			models_loaded['llm'] = rag_manager.llm is not None
		except:
			pass
		
		return jsonify({
			'success': True,
			'embeddings_ready': embeddings_ready,
			'total_products': total_products,
			'dynamic_mode': False,
			'models_loaded': models_loaded,
			'product_ids': pre_ids
		})
		
	except Exception as e:
		print(f"Error getting RAG status: {e}")
		traceback.print_exc()
		return jsonify({
			'success': False,
			'embeddings_ready': False,
			'total_products': 0,
			'dynamic_mode': True,
			'models_loaded': {
				'embedding_model': False,
				'llm': False
			},
			'error': str(e)
		}), 500

@app.route('/api/approvals', methods=['GET'])
def api_get_approvals():
	"""Return pending/in-progress applications for internal review."""
	data = load_data()
	apps = data.get('applications', [])
	pending = [a for a in apps if a.get('status') in ['submitted', 'in-progress']]
	return jsonify({'items': pending})

@app.route('/api/approvals/update', methods=['POST'])
def api_update_approval():
	"""Update a single application status and optional reviewer comment."""
	payload = request.get_json(force=True)
	app_id = payload.get('id')
	status = payload.get('status')
	comment = payload.get('comment', '').strip() if isinstance(payload.get('comment'), str) else None
	reviewer = payload.get('reviewer', 'internal')
	approved_fuid = payload.get('fuid')
	company_name = payload.get('companyName')
	product_name = payload.get('productName')
	user_email = payload.get('userEmail')
	if not status or status not in ['approved', 'rejected', 'in-progress']:
		return jsonify({'success': False, 'error': 'Invalid parameters'}), 400
	data = load_data()
	apps = data.get('applications', [])
	found = False
	# Match by id first
	if app_id:
		for a in apps:
			if a.get('id') == app_id:
				a['status'] = status
				a['statusDate'] = datetime.utcnow().strftime('%Y-%m-%d')
				if comment:
					a['reviewerComment'] = comment
				a['reviewer'] = reviewer
				if approved_fuid:
					a['fuid'] = approved_fuid
				found = True
				break
	# Fallback: match by company/product/user
	if not found and company_name and product_name and user_email:
		for a in apps:
			if (a.get('companyName') == company_name and a.get('productName') == product_name and (a.get('userEmail') or '').lower() == user_email.lower()):
				a['status'] = status
				a['statusDate'] = datetime.utcnow().strftime('%Y-%m-%d')
				if comment:
					a['reviewerComment'] = comment
				a['reviewer'] = reviewer
				if approved_fuid:
					a['fuid'] = approved_fuid
				found = True
				break
	# Append if still not found
	if not found and company_name and product_name and user_email:
		new_app = {
			'id': app_id or f"APP-{int(datetime.utcnow().timestamp()*1000)}",
			'companyName': company_name,
			'productName': product_name,
			'userEmail': user_email,
			'submittedDate': datetime.utcnow().strftime('%Y-%m-%d'),
			'status': status,
			'statusDate': datetime.utcnow().strftime('%Y-%m-%d'),
			'reviewer': reviewer,
			'reviewerComment': comment or '',
			'fuid': approved_fuid or None
		}
		apps.insert(0, new_app)
		found = True
	if not found:
		return jsonify({'success': False, 'error': 'Application not found'}), 404
	data['applications'] = apps
	save_data(data)
	return jsonify({'success': True})

@app.route('/api/approvals/history', methods=['GET'])
def api_approvals_history():
	"""Return approved and rejected applications for audit/history views."""
	data = load_data()
	apps = data.get('applications', [])
	history = [a for a in apps if a.get('status') in ['approved', 'rejected']]
	return jsonify({'items': history})

@app.route('/api/user-applications', methods=['GET'])
def api_user_applications():
	"""Get all applications submitted by a specific user from JSON file"""
	email = request.args.get('email')
	if not email:
		return jsonify({'items': []})
	
	data = load_data()
	apps = data.get('applications', [])
	user_apps = [a for a in apps if (a.get('userEmail') or '').lower() == email.lower()]
	return jsonify({'items': user_apps})

if __name__ == '__main__':
	print("Starting FUID Management System Backend...")
	print(f"Data file: {os.path.abspath(DATA_FILE)}")
	print(f"Data file exists: {os.path.exists(DATA_FILE)}")
	
	# Test data loading at startup
	try:
		test_data = load_data()
		fuid_count = len(test_data.get('fuid_mappings', {}))
		print(f"✅ Successfully loaded {fuid_count} FUIDs from data file")
		if fuid_count > 0:
			companies = set(v.get('company', '') for v in test_data.get('fuid_mappings', {}).values() if v.get('company'))
			products = set(v.get('product', '') for v in test_data.get('fuid_mappings', {}).values() if v.get('product'))
			print(f"   - {len(companies)} unique companies")
			print(f"   - {len(products)} unique products")
	except Exception as e:
		print(f"⚠️  Warning: Could not load data at startup: {e}")
	
	port = int(os.getenv('PORT', '5002'))
	print(f"\n🌐 Server starting on http://0.0.0.0:{port}")
	print(f"   Frontend should connect via proxy: http://localhost:{port}")
	print("=" * 60)
	app.run(debug=True, host='0.0.0.0', port=port) 