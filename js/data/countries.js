export const COUNTRIES_BY_LETTER = {
  A: ['Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan'],
  B: ['Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi'],
  C: ['Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo (DRC)', 'Congo (Republic)', 'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic'],
  D: ['Denmark', 'Djibouti', 'Dominica', 'Dominican Republic'],
  E: ['Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia'],
  F: ['Fiji', 'Finland', 'France'],
  G: ['Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana'],
  H: ['Haiti', 'Honduras', 'Hungary'],
  I: ['Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy'],
  J: ['Jamaica', 'Japan', 'Jordan'],
  K: ['Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan'],
  L: ['Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg'],
  M: ['Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar'],
  N: ['Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway'],
  O: ['Oman'],
  P: ['Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal'],
  Q: ['Qatar'],
  R: ['Romania', 'Russia', 'Rwanda'],
  S: ['Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria'],
  T: ['Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu'],
  U: ['Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan'],
  V: ['Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam'],
  Y: ['Yemen'],
  Z: ['Zambia', 'Zimbabwe'],
};

export const LETTERS = Object.keys(COUNTRIES_BY_LETTER);
export const ALL_COUNTRIES = Object.values(COUNTRIES_BY_LETTER).flat();

// Normalized set using the same logic as utils.js normalize()
// This ensures countries with accented chars (e.g. "Côte d'Ivoire") can be found
const _norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z\s'-]/g, '').trim().toLowerCase();
export const COUNTRY_SET = new Set(ALL_COUNTRIES.map(_norm));
