import cv2
from cvzone.HandTrackingModule import HandDetector

cap = cv2.VideoCapture(1)
detector = HandDetector(maxHands=1, detectionCon=0.7)

while True:
    success, img = cap.read()
    if not success:
        break

    # findHands now returns img and a list of hands
    hands, img = detector.findHands(img)  # hands is a list

    if hands:
        hand = hands[0]  # we only use the first hand
        lmList = hand["lmList"]  # list of 21 landmarks
        bbox = hand["bbox"]      # bounding box info [x, y, w, h]
        fingers = detector.fingersUp(hand)  # pass hand to fingersUp
        print(fingers)

    cv2.imshow("Image", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
