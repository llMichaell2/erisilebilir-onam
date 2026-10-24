"""Generate public fixed text only. Install edge-tts==7.3.1 in a virtual environment."""
import asyncio
import os
from pathlib import Path
import sys

async def main():
    try:
        import edge_tts
        import edge_tts.communicate as communicate
        # Add the operating system trust store while retaining certificate verification.
        communicate._SSL_CTX.load_default_certs()
        text = sys.stdin.read().strip()
        # Short number phrases need a sentence boundary for reliable speech output.
        if text and text[-1] not in '.!?':
            text += '.'
        output = Path(sys.argv[1])
        temporary = output.with_suffix('.part')
        try:
            await asyncio.wait_for(edge_tts.Communicate(
                text, voice='tr-TR-EmelNeural', rate='-5%',
                proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
            ).save(str(temporary)), timeout=90)
            if temporary.stat().st_size < 100:
                raise ValueError('Empty audio')
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)
    except Exception as error:
        # Never dump proxy URLs or environment values from exceptions.
        print('Speech request failed: ' + type(error).__name__ +
              (f' (HTTP {error.status})' if getattr(error, 'status', None) else ''))
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
