import { useState } from 'react';
import { resolveAssetUrl } from '../api/client.js';
import { initials } from '../lib/format.js';

export default function Avatar({ name, src, size = 56 }) {
	const [failed, setFailed] = useState(false);
	const url = resolveAssetUrl(src);
	const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

	if (url && !failed) {
		return <img className="avatar" src={url} alt="" style={style} onError={() => setFailed(true)} />;
	}
	return <span className="avatar avatar--initials" style={style} aria-hidden="true">{initials(name)}</span>;
}
