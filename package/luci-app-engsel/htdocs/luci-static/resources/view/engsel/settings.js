'use strict';
'require view';
'require form';
'require uci';

const ENV_OPTIONS = [
	[ 'BASE_API_URL', _('Base API URL') ],
	[ 'BASE_CIAM_URL', _('Base CIAM URL') ],
	[ 'BASIC_AUTH', _('Basic Auth') ],
	[ 'AX_FP_KEY', _('AX Fingerprint Key') ],
	[ 'UA', _('User Agent') ],
	[ 'API_KEY', _('API Key') ],
	[ 'ENCRYPTED_FIELD_KEY', _('Encrypted Field Key') ],
	[ 'XDATA_KEY', _('XData Key') ],
	[ 'AX_API_SIG_KEY', _('AX API Signature Key') ],
	[ 'X_API_BASE_SECRET', _('X API Base Secret') ]
];

const DECOY_OPTIONS = [
	[ 'DECOY_PREPAID_OPTION_CODE', _('Prabayar'), _('Optional override for prepaid numbers. Blank uses backend auto-detect.') ],
	[ 'DECOY_PRIORITAS_OPTION_CODE', _('PRIORITAS'), _('Optional override for PRIO/GO numbers. Blank uses backend auto-detect.') ],
	[ 'DECOY_PRIOHYBRID_OPTION_CODE', _('PRIOHYBRID'), _('Optional override for PRIOHYBRID numbers. Blank uses PRIORITAS override or backend auto-detect.') ],
	[ 'DECOY_BALANCE_OPTION_CODE', _('Fallback'), _('Optional fallback used when subscription-specific override is empty. Blank uses backend auto-detect.') ]
];
const ENV_WARNING = _('!! Jangan ubah konfigurasi ini jika bukan profesional. Nilai salah dapat membuat login dan cek kuota gagal.');

return view.extend({
	load() {
		return uci.load('engsel');
	},

	render() {
		let m, s, o;

		m = new form.Map('engsel', _('Engsel Settings'));
		s = m.section(form.NamedSection, 'config', 'engsel');
		s.anonymous = true;
		s.tab('env', _('Environment'), ENV_WARNING);
		s.tab('decoy', _('Decoy'), _('Optional package option code overrides for Balance + Decoy checkout. Leave blank unless auto-detect fails.'));

		ENV_OPTIONS.forEach((item) => {
			o = s.taboption('env', form.Value, item[0], item[1]);
			o.rmempty = false;
			o.datatype = 'string';
			o.placeholder = item[0];
		});

		DECOY_OPTIONS.forEach((item) => {
			o = s.taboption('decoy', form.Value, item[0], item[1]);
			o.rmempty = true;
			o.datatype = 'string';
			o.placeholder = item[0];
			o.description = item[2];
		});

		return m.render();
	}
});
