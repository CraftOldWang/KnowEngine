FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1 HOME=/models MINERU_MODEL_SOURCE=modelscope MINERU_DEVICE_MODE=cpu OMP_NUM_THREADS=4
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 libreoffice-writer fonts-noto-cjk && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir 'mineru[pipeline,api]==2.5.4' 'transformers==4.51.3' 'numpy<2' 'fastapi<0.120' 'httpx<0.29'
WORKDIR /service
COPY deploy/mineru/server.py .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
