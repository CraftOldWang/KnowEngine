"""Legacy MinerU endpoint plus container-local Word-to-PDF conversion."""
import asyncio
import io
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from starlette.background import BackgroundTask
from mineru.cli.fast_api import parse_pdf

app = FastAPI(title="KnowEngine MinerU 2.5.4")
gate = asyncio.Semaphore(1)


@app.get("/health")
def health():
    return {"status": "ready", "mineru": "2.5.4"}


@app.post("/file_parse")
async def file_parse(
    files: list[UploadFile] = File(...),
    backend: str = Form("pipeline"),
    response_format_zip: bool = Form(True),
    return_images: bool = Form(True),
    return_model_output: bool = Form(False),
    return_middle_json: bool = Form(False),
):
    if backend != "pipeline":
        raise HTTPException(400, "This deployment supports backend=pipeline")
    if len(files) != 1:
        raise HTTPException(400, "Upload one document per request")
    async with gate:
        work = tempfile.TemporaryDirectory(prefix="mineru-request-")
        try:
            original = files[0]
            suffix = Path(original.filename or "document.pdf").suffix.lower()
            data = await original.read(100 * 1024 * 1024 + 1)
            if len(data) > 100 * 1024 * 1024:
                raise HTTPException(413, "Maximum document size is 100 MiB")
            if suffix in {".doc", ".docx"}:
                source = Path(work.name) / ("document" + suffix)
                source.write_bytes(data)
                result = await asyncio.to_thread(subprocess.run, [
                    "soffice", "-env:UserInstallation=file://" + work.name + "/office-profile",
                    "--headless", "--convert-to", "pdf", "--outdir", work.name, str(source)
                ], capture_output=True, timeout=120)
                pdf = Path(work.name) / "document.pdf"
                if result.returncode or not pdf.is_file():
                    raise HTTPException(422, "Word-to-PDF conversion failed")
                data, suffix = pdf.read_bytes(), ".pdf"
            upload = UploadFile(filename="document" + suffix, file=io.BytesIO(data))
            response = await parse_pdf(
                files=[upload], output_dir=work.name, lang_list=["ch"], backend="pipeline",
                parse_method="auto", formula_enable=True, table_enable=True, server_url=None,
                return_md=True, return_middle_json=return_middle_json,
                return_model_output=return_model_output, return_content_list=False,
                return_images=return_images, response_format_zip=response_format_zip,
                start_page_id=0, end_page_id=99999,
            )
            previous_cleanup = response.background

            async def cleanup():
                try:
                    if previous_cleanup:
                        await previous_cleanup()
                finally:
                    work.cleanup()
            response.background = BackgroundTask(cleanup)
            return response
        except BaseException:
            work.cleanup()
            raise
