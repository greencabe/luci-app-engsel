'use strict';
'require view';
'require fs';
'require ui';

const BIN = '/usr/bin/engsel';
const SOFT_LINE = 'rgba(127,127,127,.16)';
const SOFT_BORDER = 'linear-gradient(transparent,transparent) padding-box,linear-gradient(135deg,rgba(127,127,127,.24),rgba(127,127,127,.08),rgba(127,127,127,.18)) border-box';
const PAYMENT_LOG_KEY = 'engsel.payment.logs.v1';
const LINK_KEYS = [ 'link', 'url', 'payment_url', 'deeplink', 'deep_link', 'qris_url', 'qr_url', 'detail_url', 'detail_link' ];
const DETAIL_KEYS = [ 'qris', 'qris_code', 'qr_code', 'detail', 'code', 'trx_code', 'transaction_code', 'reference_id', 'payment_id' ];
const TX_KEYS = [ 'transaction_id', 'transaction_code', 'trx_code', 'reference_id', 'payment_id' ];

function callEngsel(args) {
	return L.resolveDefault(fs.exec_direct(BIN, args, 'json'), { ok: false, error: _('Unable to execute engsel') });
}

function logText(value) {
	if (value == null)
		return '';
	if (typeof value === 'string')
		return value;
	try {
		return JSON.stringify(value, null, 2);
	} catch (err) {
		return String(value);
	}
}

function textValue(value) {
	if (value == null || value === '')
		return '';
	if (typeof value === 'object')
		return logText(value);
	return String(value);
}

function firstValue(obj, keys) {
	if (!obj || typeof obj !== 'object')
		return '';
	for (let index = 0; index < keys.length; index++) {
		const value = obj[keys[index]];
		if (value != null && value !== '')
			return value;
	}
	return '';
}

function findScalarKey(value, keys, depth) {
	if (!value || typeof value !== 'object' || depth > 5)
		return '';

	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index++) {
			const found = findScalarKey(value[index], keys, depth + 1);
			if (found)
				return found;
		}
		return '';
	}

	const own = firstValue(value, keys);
	if (own != null && own !== '' && typeof own !== 'object')
		return String(own);

	const names = Object.keys(value);
	for (let index = 0; index < names.length; index++) {
		const found = findScalarKey(value[names[index]], keys, depth + 1);
		if (found)
			return found;
	}

	return '';
}

function transactionId(item) {
	const direct = firstValue(item, TX_KEYS);
	if (direct != null && direct !== '' && typeof direct !== 'object')
		return String(direct);
	return findScalarKey(item, TX_KEYS, 0);
}

function findHistoryList(value, depth) {
	if (Array.isArray(value))
		return value;
	if (!value || typeof value !== 'object' || depth > 5)
		return [];

	const keys = [ 'list', 'transaction_history', 'history', 'transactions', 'pending_payment' ];
	for (let index = 0; index < keys.length; index++) {
		const found = findHistoryList(value[keys[index]], depth + 1);
		if (found.length)
			return found;
	}

	if (value.data) {
		const found = findHistoryList(value.data, depth + 1);
		if (found.length)
			return found;
	}

	if (value.response) {
		const found = findHistoryList(value.response, depth + 1);
		if (found.length)
			return found;
	}

	return [];
}

function formatMoney(value) {
	if (value == null || value === '')
		return '';
	if (typeof value === 'string')
		return value;
	const number = Number(value);
	if (isNaN(number))
		return String(value);
	return 'IDR ' + String(Math.round(number)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(value) {
	if (value == null || value === '')
		return '';
	if (typeof value === 'string')
		return value;

	const number = Number(value);
	if (!number || isNaN(number))
		return '';

	const ms = number > 100000000000 ? number : number * 1000;
	try {
		return new Date(ms).toLocaleString('id-ID', {
			year: 'numeric',
			month: 'long',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch (err) {
		return new Date(ms).toISOString();
	}
}

function statusColor(value) {
	value = String(value || '').toUpperCase();
	if (value.indexOf('SUCCESS') >= 0 || value.indexOf('FINISH') >= 0 || value.indexOf('PAID') >= 0 || value === '000')
		return '#238636';
	if (value.indexOf('PENDING') >= 0 || value.indexOf('PROCESS') >= 0)
		return '#9a6700';
	if (value.indexOf('FAIL') >= 0 || value.indexOf('ERROR') >= 0 || value.indexOf('REFUND') >= 0)
		return '#b42318';
	return 'rgba(127,127,127,.82)';
}

function chip(label, value) {
	value = textValue(value);
	if (!value)
		return '';
	return E('span', {
		'style': 'display:inline-flex;align-items:center;gap:.35em;max-width:100%;border:1px solid ' + SOFT_LINE + ';border-radius:4px;padding:.22em .5em;background:rgba(127,127,127,.08);color:' + statusColor(value)
	}, [
		E('span', { 'style': 'color:inherit;opacity:.72;font-size:.9em' }, label),
		E('strong', { 'style': 'min-width:0;overflow-wrap:anywhere' }, value)
	]);
}

function fieldRow(label, value) {
	value = textValue(value);
	if (!value)
		return '';
	return E('div', { 'style': 'display:grid;grid-template-columns:10em minmax(0,1fr);gap:.65em;padding:.28em 0;border-top:1px solid ' + SOFT_LINE }, [
		E('div', { 'style': 'color:inherit;opacity:.62' }, label),
		E('div', { 'style': 'min-width:0;overflow-wrap:anywhere;font-weight:500' }, value)
	]);
}

function isLink(value) {
	value = String(value || '');
	return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function collectKeyValues(value, keys, out, seen, depth) {
	if (!value || typeof value !== 'object' || depth > 5)
		return;

	if (Array.isArray(value)) {
		value.forEach((item) => collectKeyValues(item, keys, out, seen, depth + 1));
		return;
	}

	Object.keys(value).forEach((key) => {
		const item = value[key];
		if (keys.indexOf(key) >= 0 && item != null && item !== '') {
			const signature = key + ':' + logText(item);
			if (!seen[signature]) {
				seen[signature] = true;
				out.push([ key, item ]);
			}
		}
		if (item && typeof item === 'object')
			collectKeyValues(item, keys, out, seen, depth + 1);
	});
}

function keyLabel(key) {
	return String(key || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function linkPanel(item) {
	const links = [];
	const details = [];
	const seen = {};

	collectKeyValues(item, LINK_KEYS, links, seen, 0);
	collectKeyValues(item, DETAIL_KEYS, details, seen, 0);

	const linkNodes = links.filter((entry) => isLink(entry[1])).map((entry) => E('a', {
		'class': 'btn cbi-button cbi-button-save',
		'href': String(entry[1]),
		'target': '_blank',
		'rel': 'noopener',
		'style': 'margin:.25em .35em .25em 0;max-width:100%;overflow:hidden;text-overflow:ellipsis'
	}, keyLabel(entry[0])));

	const rawNodes = links.filter((entry) => !isLink(entry[1])).concat(details).map((entry) => E('details', { 'style': 'margin-top:.55em' }, [
		E('summary', { 'style': 'cursor:pointer;font-weight:650' }, keyLabel(entry[0])),
		E('pre', { 'style': 'margin-top:.45em;max-height:18em;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(127,127,127,.08);border:1px solid ' + SOFT_LINE + ';border-radius:6px;padding:.7em' }, logText(entry[1]))
	]));

	if (!linkNodes.length && !rawNodes.length)
		return '';

	return E('div', { 'style': 'margin-top:.8em' }, [
		linkNodes.length ? E('div', { 'style': 'display:flex;gap:.35em;flex-wrap:wrap' }, linkNodes) : '',
		...rawNodes
	]);
}

function showStatusModal(title, tx, data) {
	ui.showModal(title, [
		E('div', { 'style': 'font-weight:650;overflow-wrap:anywhere' }, tx),
		responsePanel(data),
		E('pre', { 'style': 'margin-top:.8em;max-height:30em;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(127,127,127,.08);border:1px solid ' + SOFT_LINE + ';border-radius:6px;padding:.75em' }, logText(data)),
		E('div', { 'style': 'display:flex;justify-content:flex-end;margin-top:1em' }, [
			E('button', { 'class': 'btn cbi-button', 'click': () => ui.hideModal() }, _('Close'))
		])
	]);
}

function refreshStatusButton(item) {
	const tx = transactionId(item);
	if (!tx)
		return '';

	return E('button', {
		'class': 'btn cbi-button cbi-button-action',
		'style': 'margin-top:.8em',
		'click': () => {
			ui.showModal(_('Transaction Status'), [
				E('div', { 'style': 'font-weight:650;overflow-wrap:anywhere' }, tx),
				E('div', { 'style': 'margin-top:.75em' }, _('Loading...'))
			]);
			callEngsel([ 'json', 'transaction-status', tx ]).then((data) => showStatusModal(_('Transaction Status'), tx, data));
		}
	}, _('Refresh Status'));
}

function showPendingTransactions() {
	ui.showModal(_('Pending Transactions'), [ E('div', {}, _('Loading...')) ]);
	callEngsel([ 'json', 'pending' ]).then((data) => showStatusModal(_('Pending Transactions'), _('pending_payment'), data));
}

function transactionCard(item, index) {
	item = item || {};
	const title = textValue(firstValue(item, [ 'title', 'package_name', 'name', 'payment_for' ])) || _('Transaction');
	const price = formatMoney(firstValue(item, [ 'price', 'raw_price', 'amount', 'total_amount' ]));
	const date = formatDate(firstValue(item, [ 'formated_date', 'formatted_date', 'date', 'created_at', 'timestamp' ]));
	const method = firstValue(item, [ 'payment_method_label', 'payment_with_label', 'payment_method', 'payment_with' ]);
	const status = firstValue(item, [ 'status', 'transaction_status' ]);
	const paymentStatus = firstValue(item, [ 'payment_status', 'payment_state' ]);
	const message = firstValue(item, [ 'error', 'status_message', 'message', 'description' ]);

	return E('div', { 'class': 'cbi-section', 'style': 'margin-top:1em;border:1px solid transparent;border-radius:8px;background:' + SOFT_BORDER + ';padding:1em' }, [
		E('div', { 'style': 'display:grid;grid-template-columns:2.5em minmax(0,1fr) auto;gap:.8em;align-items:start' }, [
			E('div', { 'style': 'width:2.5em;height:2.5em;line-height:2.5em;text-align:center;border-radius:4px;background:rgba(127,127,127,.16);font-weight:700' }, String(index + 1)),
			E('div', { 'style': 'min-width:0' }, [
				E('div', { 'style': 'font-size:1.08em;font-weight:700;line-height:1.25;overflow-wrap:anywhere' }, title),
				date ? E('div', { 'style': 'margin-top:.25em;color:inherit;opacity:.62' }, date) : ''
			]),
			price ? E('div', { 'style': 'font-weight:800;color:#0645c8;white-space:nowrap;text-align:right' }, price) : ''
		]),
		E('div', { 'style': 'display:flex;gap:.45em;flex-wrap:wrap;margin-top:.75em' }, [
			chip(_('Status'), status),
			chip(_('Payment'), paymentStatus)
		]),
		E('div', { 'style': 'margin-top:.75em' }, [
			fieldRow(_('Method'), method),
			fieldRow(_('Target'), firstValue(item, [ 'target_msisdn', 'msisdn', 'subscriber_id' ])),
			fieldRow(_('Validity'), item.validity),
			fieldRow(_('Category'), item.category),
			fieldRow(_('Message'), message)
		]),
		refreshStatusButton(item),
		linkPanel(item),
		E('details', { 'style': 'margin-top:.8em' }, [
			E('summary', { 'style': 'cursor:pointer;font-weight:650' }, _('Raw response')),
			E('pre', { 'style': 'margin-top:.55em;max-height:22em;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(127,127,127,.08);border:1px solid ' + SOFT_LINE + ';border-radius:6px;padding:.75em' }, logText(item))
		])
	]);
}

function responsePanel(data) {
	const status = firstValue(data, [ 'status', 'code' ]);
	const message = firstValue(data, [ 'error', 'message' ]);
	if (!status && !message)
		return '';
	return E('div', { 'class': data && data.ok === false ? 'alert-message warning' : 'alert-message', 'style': 'margin-top:1em' }, [
		status ? E('div', {}, [ E('strong', {}, _('Status')), ': ', textValue(status) ]) : '',
		message ? E('div', { 'style': 'margin-top:.25em;overflow-wrap:anywhere' }, [ E('strong', {}, _('Message')), ': ', textValue(message) ]) : ''
	]);
}

function currentMode() {
	const path = window.location.pathname + window.location.search + window.location.hash;
	return path.indexOf('/riwayat/logs') >= 0 || path.indexOf('riwayat/logs') >= 0 ? 'logs' : 'transaction-history';
}

function readPaymentLogs() {
	if (typeof localStorage === 'undefined')
		return [];
	try {
		const logs = JSON.parse(localStorage.getItem(PAYMENT_LOG_KEY) || '[]');
		return Array.isArray(logs) ? logs : [];
	} catch (err) {
		return [];
	}
}

function paymentLogCard(entry, index) {
	entry = entry || {};
	const response = entry.response || entry.payload || entry;
	const status = entry.status || firstValue(response, [ 'status', 'payment_status', 'code' ]);
	const message = entry.message || firstValue(response, [ 'message', 'error', 'description', 'title', 'code_detail' ]);
	const items = Array.isArray(entry.items) ? entry.items : [];
	const date = formatDate(entry.time || entry.timestamp || entry.created_at);
	const quotedTotal = entry.quoted_total != null && entry.quoted_total !== '' ? entry.quoted_total : (items.length ? items.reduce((sum, item) => sum + Number(item.price || 0), 0) : '');
	const totalAmount = entry.total_amount != null && entry.total_amount !== '' ? entry.total_amount : firstValue(response, [ 'total_amount' ]);
	const customPrice = entry.custom_price != null && entry.custom_price !== '' ? entry.custom_price : firstValue(response, [ 'custom_price' ]);

	return E('div', { 'class': 'cbi-section', 'style': 'margin-top:1em;border:1px solid transparent;border-radius:8px;background:' + SOFT_BORDER + ';padding:1em' }, [
		E('div', { 'style': 'display:grid;grid-template-columns:2.5em minmax(0,1fr) auto;gap:.8em;align-items:start' }, [
			E('div', { 'style': 'width:2.5em;height:2.5em;line-height:2.5em;text-align:center;border-radius:4px;background:rgba(127,127,127,.16);font-weight:700' }, String(index + 1)),
			E('div', { 'style': 'min-width:0' }, [
				E('div', { 'style': 'font-size:1.08em;font-weight:700;line-height:1.25;overflow-wrap:anywhere' }, message || _('Server payment log')),
				date ? E('div', { 'style': 'margin-top:.25em;color:inherit;opacity:.62' }, date) : ''
			]),
			chip(_('Status'), status)
		]),
		E('div', { 'style': 'display:flex;gap:.45em;flex-wrap:wrap;margin-top:.75em' }, [
			chip(_('Source'), entry.source),
			chip(_('Payment'), entry.payment),
			chip(_('Quoted'), formatMoney(quotedTotal)),
			chip(_('Paid'), formatMoney(totalAmount)),
			chip(_('Custom'), formatMoney(customPrice))
		]),
		items.length ? E('div', { 'style': 'margin-top:.75em;border-top:1px solid ' + SOFT_LINE }, items.map((item) => E('div', { 'style': 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1em;padding:.45em 0;border-bottom:1px solid ' + SOFT_LINE }, [
			E('div', { 'style': 'min-width:0;overflow-wrap:anywhere' }, item.name || item.code || '-'),
			E('div', { 'style': 'white-space:nowrap;font-weight:650;color:#0645c8' }, formatMoney(item.price))
		]))) : '',
		refreshStatusButton(response),
		linkPanel(response),
		E('details', { 'style': 'margin-top:.8em' }, [
			E('summary', { 'style': 'cursor:pointer;font-weight:650' }, _('Raw response')),
			E('pre', { 'style': 'margin-top:.55em;max-height:26em;overflow:auto;white-space:pre-wrap;word-break:break-word;background:rgba(127,127,127,.08);border:1px solid ' + SOFT_LINE + ';border-radius:6px;padding:.75em' }, logText(response))
		])
	]);
}

function transactionHistoryPage(data) {
	const history = findHistoryList(data, 0);

	return E('div', { 'class': 'cbi-map' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;gap:1em;align-items:center;flex-wrap:wrap' }, [
			E('div', {}, [
				E('h2', { 'style': 'margin:0' }, _('Riwayat')),
				E('div', { 'style': 'margin-top:.25em;color:inherit;opacity:.65' }, _('Transaction History'))
			]),
			E('div', { 'style': 'display:flex;gap:.45em;flex-wrap:wrap' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-neutral', 'click': showPendingTransactions }, _('Pending Payments')),
				E('button', { 'class': 'btn cbi-button cbi-button-reload', 'click': () => window.location.reload() }, _('Refresh'))
			])
		]),
		responsePanel(data),
		history.length ? E('div', {}, history.map(transactionCard)) : E('div', { 'class': 'alert-message warning', 'style': 'margin-top:1em' }, (data && (data.error || data.message)) || _('No transaction history.'))
	]);
}

function paymentLogsPage() {
	const logs = readPaymentLogs();

	return E('div', { 'class': 'cbi-map' }, [
		E('div', { 'style': 'display:flex;justify-content:space-between;gap:1em;align-items:center;flex-wrap:wrap' }, [
			E('div', {}, [
				E('h2', { 'style': 'margin:0' }, _('Riwayat')),
				E('div', { 'style': 'margin-top:.25em;color:inherit;opacity:.65' }, _('Logs'))
			]),
			E('button', { 'class': 'btn cbi-button cbi-button-reload', 'click': () => window.location.reload() }, _('Refresh'))
		]),
		logs.length ? E('div', {}, logs.map(paymentLogCard)) : E('div', { 'class': 'alert-message warning', 'style': 'margin-top:1em' }, _('No payment logs.'))
	]);
}

return view.extend({
	load() {
		return currentMode() === 'logs' ? Promise.resolve({}) : callEngsel([ 'json', 'transaction-history' ]);
	},

	render(data) {
		return currentMode() === 'logs' ? paymentLogsPage() : transactionHistoryPage(data);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
