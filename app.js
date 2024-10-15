let previousFacePositions = new Map();
const movementThreshold = 20;
let effectsEnabled = false;
let smileCount = 0;
let blinkCount = 0;
let sunglasses, hat, mustache;
let emojis = ["😀", "😎", "🤠", "🤓", "🧐", "🤪"];
let currentEmojiIndex = 0;
let faceExpressions = new Map();

async function loadModel() {
  const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
  const detector = await faceDetection.createDetector(model, {
    runtime: "tfjs",
    modelType: "short",
  });
  return detector;
}

async function setupWebcam() {
  const webcamElement = document.getElementById("webcam");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamElement.srcObject = stream;
    return new Promise((resolve) => {
      webcamElement.onloadedmetadata = () => resolve(webcamElement);
    });
  } catch (error) {
    console.error("Error accessing the webcam:", error);
    alert(
      "Unable to access the webcam. Please make sure it's connected and you've granted permission."
    );
    throw error;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadResources() {
  try {
    [sunglasses, hat, mustache] = await Promise.all([
      loadImage(document.getElementById("sunglasses").src),
      loadImage(document.getElementById("hat").src),
      loadImage(document.getElementById("mustache").src),
    ]);
    console.log("Images loaded successfully");
    effectsEnabled = true;
  } catch (error) {
    console.warn("Error loading images:", error);
    console.log("Continuing without image effects");
    effectsEnabled = false;
  }
}

function takeSnapshot() {
  const canvas = document.getElementById("outputCanvas");
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = "face_detection_snapshot.png";
  link.click();
}

function toggleEffects() {
  if (sunglasses && hat && mustache) {
    effectsEnabled = !effectsEnabled;
    const btn = document.getElementById("toggleEffectsBtn");
    btn.textContent = effectsEnabled ? "Disable Effects" : "Enable Effects";
    btn.classList.toggle("bg-purple-500");
    btn.classList.toggle("bg-gray-500");
  } else {
    alert("Effects are not available due to image loading issues.");
  }
}

function cycleEmoji() {
  currentEmojiIndex = (currentEmojiIndex + 1) % emojis.length;
}

async function detectFaces() {
  try {
    await loadResources();
    const detector = await loadModel();
    const webcam = await setupWebcam();
    const canvas = document.getElementById("outputCanvas");
    if (!canvas) {
      throw new Error("Output canvas not found in the document");
    }
    const ctx = canvas.getContext("2d");
    canvas.width = webcam.videoWidth;
    canvas.height = webcam.videoHeight;

    // Add event listeners only if elements exist
    const snapshotBtn = document.getElementById("snapshotBtn");
    if (snapshotBtn) {
      snapshotBtn.addEventListener("click", takeSnapshot);
    }

    const toggleEffectsBtn = document.getElementById("toggleEffectsBtn");
    if (toggleEffectsBtn) {
      toggleEffectsBtn.addEventListener("click", toggleEffects);
    }

    const cycleEmojiBtn = document.getElementById("cycleEmojiBtn");
    if (cycleEmojiBtn) {
      cycleEmojiBtn.addEventListener("click", cycleEmoji);
    }

    async function detect() {
      const faces = await detector.estimateFaces(webcam, { flipHorizontal: false });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

      faces.forEach((face, index) => {
        drawFaceBox(ctx, face, index);
        if (effectsEnabled) {
          drawFaceEffects(ctx, face);
        }
        detectSmile(face, index);
        detectBlink(face);
        detectMovement(face, index);
        drawEmoji(ctx, face);
      });

      updateStats(faces.length);
      requestAnimationFrame(detect);
    }

    detect();
  } catch (error) {
    console.error("Error in face detection:", error);
    alert("An error occurred while setting up face detection. Please check the console for more details and ensure all necessary HTML elements are present.");
  }
}

// Modify updateStats function to handle missing elements
function updateStats(faceCount) {
  const facesDetectedEl = document.getElementById("facesDetected");
  const smileDetectedEl = document.getElementById("smileDetected");
  const blinkDetectedEl = document.getElementById("blinkDetected");
  const faceExpressionsEl = document.getElementById("faceExpressions");

  if (facesDetectedEl) {
    facesDetectedEl.textContent = `Faces Detected: ${faceCount}`;
  }
  if (smileDetectedEl) {
    smileDetectedEl.textContent = `Smiles Detected: ${smileCount}`;
  }
  if (blinkDetectedEl) {
    blinkDetectedEl.textContent = `Blinks Detected: ${blinkCount}`;
  }
  
  if (faceExpressionsEl) {
    let expressionsText = "Face Expressions: ";
    faceExpressions.forEach((expression, index) => {
      expressionsText += `Face ${index + 1}: ${expression} `;
    });
    faceExpressionsEl.textContent = expressionsText;
  }
}

// Modify takeSnapshot function to handle missing elements
function takeSnapshot() {
  const canvas = document.getElementById("outputCanvas");
  if (canvas) {
    const dataURL = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "face_detection_snapshot.png";
    link.click();
  } else {
    console.error("Canvas not found, cannot take snapshot");
  }
}

// Modify detectMovement function to handle missing elements
function detectMovement(face, faceIndex) {
  const currentPosition = { x: face.box.xMin, y: face.box.yMin };
  if (previousFacePositions.has(faceIndex)) {
    const prevPosition = previousFacePositions.get(faceIndex);
    const distanceMoved = Math.sqrt(
      Math.pow(currentPosition.x - prevPosition.x, 2) +
      Math.pow(currentPosition.y - prevPosition.y, 2)
    );

    if (distanceMoved > movementThreshold) {
      const snapshotBtn = document.getElementById("snapshotBtn");
      if (snapshotBtn) {
        snapshotBtn.classList.add("pulse");
        setTimeout(() => snapshotBtn.classList.remove("pulse"), 2000);
      }
    }
  }
  previousFacePositions.set(faceIndex, currentPosition);
}

detectFaces();

function drawFaceBox(ctx, face, index) {
  const { width, height, xMin, yMin } = face.box;
  ctx.strokeStyle = `hsl(${index * 60}, 100%, 50%)`;
  ctx.lineWidth = 2;
  ctx.strokeRect(xMin, yMin, width, height);

  // Draw facial landmarks
  if (face.keypoints) {
    face.keypoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
      ctx.fill();
    });
  }

  // Draw face index
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.fillText(`Face ${index + 1}`, xMin, yMin - 10);
}

function drawFaceEffects(ctx, face) {
  const { width, height, xMin, yMin } = face.box;

  if (face.keypoints) {
    // Draw sunglasses
    const leftEye = face.keypoints.find((point) => point.name === "leftEye");
    const rightEye = face.keypoints.find((point) => point.name === "rightEye");
    if (leftEye && rightEye && sunglasses) {
      const eyesDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) +
          Math.pow(rightEye.y - leftEye.y, 2)
      );
      const glassesWidth = eyesDistance * 2.5;
      const glassesHeight = glassesWidth * 0.5;
      const glassesX = (leftEye.x + rightEye.x) / 2 - glassesWidth / 2;
      const glassesY = (leftEye.y + rightEye.y) / 2 - glassesHeight / 2;
      ctx.drawImage(
        sunglasses,
        glassesX,
        glassesY,
        glassesWidth,
        glassesHeight
      );
    }

    // Draw hat
    const topHead = face.keypoints.find(
      (point) => point.name === "midwayBetweenEyes"
    );
    if (topHead && hat) {
      const hatWidth = width * 1.2;
      const hatHeight = height * 0.6;
      const hatX = topHead.x - hatWidth / 2;
      const hatY = topHead.y - hatHeight * 1.1;
      ctx.drawImage(hat, hatX, hatY, hatWidth, hatHeight);
    }

    // Draw mustache
    const nose = face.keypoints.find((point) => point.name === "noseTip");
    const mouth = face.keypoints.find((point) => point.name === "mouthCenter");
    if (nose && mouth && mustache) {
      const mustacheWidth = width * 0.4;
      const mustacheHeight = height * 0.1;
      const mustacheX = nose.x - mustacheWidth / 2;
      const mustacheY = (nose.y + mouth.y) / 2 - mustacheHeight / 2;
      ctx.drawImage(
        mustache,
        mustacheX,
        mustacheY,
        mustacheWidth,
        mustacheHeight
      );
    }
  }
}

function detectSmile(face, index) {
  if (face.keypoints) {
    const mouthLeft = face.keypoints.find(
      (point) => point.name === "mouthLeft"
    );
    const mouthRight = face.keypoints.find(
      (point) => point.name === "mouthRight"
    );
    if (mouthLeft && mouthRight) {
      const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
      const faceWidth = face.box.width;
      if (mouthWidth > faceWidth * 0.4) {
        smileCount++;
        faceExpressions.set(index, "😄");
      } else {
        faceExpressions.set(index, "😐");
      }
    }
  }
}

function detectBlink(face) {
  if (face.keypoints) {
    const leftEye = face.keypoints.find((point) => point.name === "leftEye");
    const rightEye = face.keypoints.find((point) => point.name === "rightEye");
    const leftEyeUpper = face.keypoints.find(
      (point) => point.name === "leftEyeUpper"
    );
    const leftEyeLower = face.keypoints.find(
      (point) => point.name === "leftEyeLower"
    );
    const rightEyeUpper = face.keypoints.find(
      (point) => point.name === "rightEyeUpper"
    );
    const rightEyeLower = face.keypoints.find(
      (point) => point.name === "rightEyeLower"
    );

    if (
      leftEye &&
      rightEye &&
      leftEyeUpper &&
      leftEyeLower &&
      rightEyeUpper &&
      rightEyeLower
    ) {
      const leftEyeOpenness =
        Math.abs(leftEyeUpper.y - leftEyeLower.y) / face.box.height;
      const rightEyeOpenness =
        Math.abs(rightEyeUpper.y - rightEyeLower.y) / face.box.height;

      if (leftEyeOpenness < 0.05 && rightEyeOpenness < 0.05) {
        blinkCount++;
      }
    }
  }
}

function detectMovement(face, faceIndex) {
  const currentPosition = { x: face.box.xMin, y: face.box.yMin };
  if (previousFacePositions.has(faceIndex)) {
    const prevPosition = previousFacePositions.get(faceIndex);
    const distanceMoved = Math.sqrt(
      Math.pow(currentPosition.x - prevPosition.x, 2) +
        Math.pow(currentPosition.y - prevPosition.y, 2)
    );

    if (distanceMoved > movementThreshold) {
      const snapshotBtn = document.getElementById("snapshotBtn");
      snapshotBtn.classList.add("pulse");
      setTimeout(() => snapshotBtn.classList.remove("pulse"), 2000);
    }
  }
  previousFacePositions.set(faceIndex, currentPosition);
}

function drawEmoji(ctx, face) {
  const { xMin, yMin } = face.box;
  ctx.font = "30px Arial";
  ctx.fillText(emojis[currentEmojiIndex], xMin + 10, yMin + 30);
}

function updateStats(faceCount) {
  document.getElementById(
    "facesDetected"
  ).textContent = `Faces Detected: ${faceCount}`;
  document.getElementById(
    "smileDetected"
  ).textContent = `Smiles Detected: ${smileCount}`;
  document.getElementById(
    "blinkDetected"
  ).textContent = `Blinks Detected: ${blinkCount}`;

  let expressionsText = "Face Expressions: ";
  faceExpressions.forEach((expression, index) => {
    expressionsText += `Face ${index + 1}: ${expression} `;
  });
  document.getElementById("faceExpressions").textContent = expressionsText;
}

detectFaces();
