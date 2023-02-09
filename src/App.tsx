import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const chunkSize: number = 10 * 1024;

function App() {
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const [lastUploadedFileIndex, setLastUploadedFileIndex] = useState<
    number | null
  >(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(
    null
  );

  function handleDrop(e: any) {
    e.preventDefault();
    setFiles([...files, ...e.dataTransfer.files]);
  }

  function readAndUploadCurrentChunk() {
    const reader = new FileReader();
    const file = files[currentFileIndex!];
    if (!file) {
      return;
    }
    const from = currentChunkIndex! * chunkSize!;
    const to = from + chunkSize;
    const blob = file.slice(from, to);

    reader.onload = (e: ProgressEvent<FileReader>) => uploadChunk(e);
    reader.readAsDataURL(blob);
  }

  function uploadChunk(readerEvent: ProgressEvent<FileReader>) {
    const file = files[currentFileIndex!];
    const data = readerEvent.target!.result;

    const params = new URLSearchParams();
    params.set("name", file.name);
    params.set("size", file.size);
    params.set("currentChunkIndex", currentChunkIndex!.toString());
    params.set("totalChunks", Math.ceil(file.size / chunkSize).toString());

    const headers = { "Content-Type": "application/octet-stream" };
    const url = `${
      process.env.REACT_APP_BE_URL
    }/api/v1/upload/game?${params.toString()}`;

    console.log(url);

    axios.post(url, data, { headers }).then((response) => {
      const file = files[currentFileIndex!];
      const filesize = files[currentFileIndex!].size;
      const chunks = Math.ceil(filesize / chunkSize!) - 1;
      const isLastChunk = currentChunkIndex === chunks;
      if (isLastChunk) {
        file.finalFilename = response.data.finalFilename;
        setLastUploadedFileIndex(currentFileIndex);
        setCurrentChunkIndex(null);
      } else {
        setCurrentChunkIndex(currentChunkIndex! + 1);
      }
    });
  }

  useEffect(() => {
    if (lastUploadedFileIndex === null) {
      return;
    }
    const isLastFile = lastUploadedFileIndex === files.length - 1;
    const nextFileIndex = isLastFile ? null : currentFileIndex! + 1;
    setCurrentFileIndex(nextFileIndex);
  }, [lastUploadedFileIndex]);

  useEffect(() => {
    if (files.length > 0) {
      if (currentFileIndex === null) {
        setCurrentFileIndex(
          lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1
        );
      }
    }
  }, [files.length]);

  useEffect(() => {
    if (currentFileIndex !== null) {
      setCurrentChunkIndex(0);
    }
  }, [currentFileIndex]);

  useEffect(() => {
    if (currentChunkIndex !== null) {
      readAndUploadCurrentChunk();
    }
  }, [currentChunkIndex]);

  return (
    <div>
      <p>Backend URL: {process.env.REACT_APP_BE_URL}</p>
      <div
        onDragOver={(e) => {
          setDropzoneActive(true);
          e.preventDefault();
        }}
        onDragLeave={(e) => {
          setDropzoneActive(false);
          e.preventDefault();
        }}
        onDrop={(e) => handleDrop(e)}
        className={"dropzone" + (dropzoneActive ? " active" : "")}
      >
        Drop your files here
      </div>
      <div className="files">
        {files.map((file, fileIndex) => {
          let progress = 0;
          if (file.finalFilename) {
            progress = 100;
          } else {
            const uploading = fileIndex === currentFileIndex;
            const chunks = Math.ceil(file.size / chunkSize);
            if (uploading) {
              progress = Math.round((currentChunkIndex! / chunks) * 100);
            } else {
              progress = 0;
            }
          }
          return (
            <a
              className="file"
              target="_blank"
              rel="noreferrer"
              key={file.name}
              href={`${process.env.REACT_APP_BE_URL}/uploads/${file.finalFilename}`}
            >
              <div className="name">{file.name}</div>
              <div
                className={"progress " + (progress === 100 ? "done" : "")}
                style={{ width: progress + "%" }}
              >
                {progress}%
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default App;
