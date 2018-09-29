
let serverAddress = "http://localhost:8080"; //when working localy
// let serverAddress = "http://webrtc-telemedicine-cdta.appspot.com:8080"; //when hosted


let iceServersConfig = {'iceServers':[ 
        {'url':'stun:stun2.l.google.com:19302'},
        {'url':'stun:stun3.l.google.com:19302'},
        {'url':'stun:stun4.l.google.com:19302'},
        {'url':'stun:stunserver.org:3478'},
        {'url':'stun:stun1.l.google.com:19302'},
        {'url':'stun:stun.zadarma.com:3478'},
        {'url':'stun:stun.voipcheap.com:3478'}
    ]};

let mediaConstraints = {
    video : true,
    audio : false
}
