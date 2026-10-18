import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { getPhoto, storePhoto, deletePhoto } from './atelierMedia';
const KEY = 'bkit.landscape.v1';
/** A small editorial pause. Personal originals remain in the same device-only vault. */
export function LandscapeNote() {
  const [id, setId] = useState(() => {
    try {
      return localStorage.getItem(KEY) || '';
    } catch {
      return '';
    }
  });
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);
  useEffect(() => {
    if (!id) {
      setUrl('');
      return;
    }
    let live = true,
      objectUrl = '';
    getPhoto(id)
      .then((photo) => {
        if (live && photo) {
          objectUrl = URL.createObjectURL(photo.blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => setMessage('원본 사진을 읽지 못했습니다. 다시 첨부해 주세요.'));
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  return (
    <aside className="landscape-note" aria-label="잠깐의 풍경">
      <figure>
        <img
          src={url || import.meta.env.BASE_URL + 'landscapes/forest.jpg'}
          width="640"
          height="426"
          alt={url ? '내가 선택한 쉬어 가는 풍경' : '나뭇잎 사이로 아침 햇살이 드는 숲'}
          loading="lazy"
          decoding="async"
        />
        <figcaption>{url ? 'MY OWN LITTLE VIEW' : 'A MOMENT IN THE GREEN'}</figcaption>
      </figure>
      <div>
        <span className="landscape-kicker">BREATHE. BEGIN AGAIN.</span>
        <p>
          조금의 집중,
          <br />
          조금의 여유.
        </p>
        <label className="landscape-upload">
          <ImagePlus size={15} /> 나의 풍경으로 바꾸기
          <input
            type="file"
            accept="image/*"
            aria-label="나의 풍경 사진"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file || busy.current) return;
              busy.current = true;
              let next = '';
              try {
                next = await storePhoto(file, []);
                localStorage.setItem(KEY, next);
                setId(next);
                setMessage('나의 사진을 이 기기에 보관했습니다.');
                if (id) await deletePhoto(id);
              } catch {
                if (next && localStorage.getItem(KEY) !== next) void deletePhoto(next);
                setMessage('사진을 저장하지 못했습니다. 파일과 기기 저장 공간을 확인해 주세요.');
              } finally {
                busy.current = false;
              }
            }}
          />
        </label>
        {id && (
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(KEY);
                setId('');
                setUrl('');
                void deletePhoto(id).catch(() => setMessage('사진 파일을 삭제하지 못했습니다.'));
              } catch {
                setMessage('기기 저장소에 접근하지 못했습니다.');
              }
            }}
          >
            기본 풍경으로
          </button>
        )}
        {message && <small role="status">{message}</small>}
        <small>
          {url ? '사진은 외부로 전송되지 않아요.' : '숲 사진 · Sebastian Unrau / Unsplash'}
        </small>
      </div>
    </aside>
  );
}
