import cv2
import mediapipe as mp
import csv
import json

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_face_mesh = mp.solutions.face_mesh

# For static images:
videos = []

cap = cv2.VideoCapture('/home/arnav/Downloads/video-1647646130.mp4')

markers_dict = json.load(open("/home/arnav/Desktop/csc2521/face-select/python_scripts/marker_arr.json"))
markers = markers_dict["main"]

with mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5) as face_mesh:

    with open('test.csv', 'w', newline='\n') as csvfile:
        frame_count = 0
        csv_writer = csv.writer(csvfile, delimiter=',',
                            quotechar='|', quoting=csv.QUOTE_MINIMAL)

        while cap.isOpened():
            ret, frame = cap.read()

            # if frame is read correctly ret is True
            if not ret:
                break

            results = face_mesh.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            if not results.multi_face_landmarks:
                continue
            
            for face_landmarks in results.multi_face_landmarks:
                landmark_list = face_landmarks.landmark
                landmarks_arr = [frame_count]
                for idx, landmark in enumerate(landmark_list):
                    if idx in markers:
                        landmarks_arr.append(landmark.x)
                        landmarks_arr.append(landmark.y) 
                        landmarks_arr.append(landmark.z)

            csv_writer.writerow(landmarks_arr)
            frame_count += 1

cap.release()