var express = require('express');
var SIO = require('socket.io');

var users = [];
var sockets = [];
var conversations = [];

//des données de test pour les conversation programmées
var programmedConversations = [
    {
        id:0,
        title : "Conversation 1",
        moderator : "charef",
        members : [
            "faysal",
            "benchohra"
        ],
        time : new Date()
    },
    {
        id:1,
        title : "Conversation 2",
        moderator :"benchohra" ,
        members : [
            "charef",
            "faysal"  
        ],
        time : new Date()
    },
    {
        id:2,
        title : "Conversation 3",
        moderator : "faysal",
        members : [
            "charef",
            "benchohra"
        ],
        time : new Date()
    },
    {
        id:3,
        title : "Conversation 4",
        moderator : "faysal",
        members : [
            "charef",
            "benchohra"
        ],
        time : new Date()
    },
    {
        id:4,
        title : "Conversation 5",
        moderator : "faysal",
        members : [
            "charef",
            "benchohra"
        ],
        time : new Date()
    }
];



var app = express();

var server  =  app.listen(8080,function(){
    console.log("Started listening on port 8080.");
});

app.use(express.static("public"));

// var io = SIO(server);
var io = SIO.listen(server);

io.on('connection',function(socket){
    console.log("someone connected");
    
    //ajouter la socket à la liste des sockets
    sockets[sockets.length] = socket;

    /// login
    socket.on("login",function(data){
        console.log("user has logged in ",data.userName);
        login(data.userName,data.password,socket);
    });

    /// joindre une conversation 
    socket.on("join", function(data){
        console.log("user joined conversation "+data.convId);

        join(data.convId,socket.id);
    });

    /// quitter une conversation 
    socket.on("leaveConversation", function(data){
        leaveConversation(data.convId,socket.id);
    });

    /// deconnecter
    socket.on("logout",function(data){
        logout(socket.id);
    });

    ///dsp: envoyer la description de la session
    socket.on('sdp',function(data){
        sdp(data.description,socket.id,data.receiverId,data.offer); 
    });;

    ///ice: envoyer le candidat ice
    socket.on('ice',function(data){
        ice(data.ice,socket.id,data.receiverId);
    });

    socket.on('askPermission', function(data) {
        var conv = findInCurrentConversations(data.convId);
        if (conv > -1) {
            if(socket.id !== conversations[conv].moderator.socket.id) {
                conversations[conv].moderator.socket.emit('askPermission',{userId:socket.id});
            }else{
                grantPermission(data.convId,socket.id);
            }
        }
    });

    socket.on('grantPermission', function(data) {
        grantPermission(data.convId, data.userId);
    });
   
});


///fonction de connection 
function  login(userName, password, socket){
    if(password !== '!'){
        var userInstance = new user(userName,socket);
        sendConversationList(userInstance);
        users.push(userInstance);
        console.log("loginSuccess");
        socket.emit("loginSuccess",{});
    }else{
        console.log("wrong password");
        socket.emit("loginFailed");
    }
}

function grantPermission(convId, userId) {
    conv = findInCurrentConversations(convId);
    if (conv > -1) {
        conversations[conv].activeUser = userId;
        conversations[conv].broadcast('grantPermission',{userId: userId});
    }
}

/// fonction de deconnexion
function logout(userId){

}


/// fonction de joindre une conversation
function join(convId,userId){
   console.log("joining conversation "+convId);
   var conv = getConversation(convId);
   if(conv){
        user1 = findUserById(userId);
        if(conv.setModerator(user1)){
            conv.activeUser = userId;
            user1.socket.emit("joinSuccess",{moderator: true, activeUser: conv.activeUser});
        }
        else user1.socket.emit("joinSuccess",{moderator : false, activeUser: conv.activeUser});
        if (conv.activeUser == null) {
            conv.activeUser = userId;
        }
        conv.sendUsersList(user1);
        conv.broadcast("join",{
            userId:userId,
            userName:user1.userName,    
            activeUser: conv.activeUser
        });
        conv.add(user1);
   }
}

function getConversation(convId){
    console.log("   getting conversation "+convId);
    var conv;
    conv = findInCurrentConversations(convId);
    if(conv>-1)return conversations[conv];
    else return createConversation(convId);
}



function createConversation(convId){
    var programmedConv = findProgrammedConversation(convId);
    if(programmedConv>-1){
        console.log("       creating the conversation");
        var conv = new conversation(programmedConversations[programmedConv]);
        conversations.push(conv);
        return conv;
    }
    return null;
}


/// fonction de quitter une conversation
function leaveConversation(convId,userId){
    console.log("user left conversation : ", userId);
    var convIndex = findInCurrentConversations(convId);
    if(convIndex > -1) {
        conversations[convIndex].remove(userId);
        var moderator = conversations[convIndex].moderator;
        if (conversations[convIndex].activeUser === userId) {
            if (moderator && (userId !== moderator.socket.id)) {
                grantPermission(convId, conversations[convIndex].moderator.socket.id);
            }
            else {
                if (conversations[convIndex].memebers.legnth > 0) {
                    grantPermission(convId, conversations[convIndex].memebers[0].socket.id);
                }
            }
        }
        conversations[convIndex].broadcast('leaveConversation',{userId : userId});
    }else{
        console.log("conversation doesn't exist");
    }
}


///fonction d'envoie de la description de la session
function sdp(description,senderId,receiverId,offer){

   // var user1=findUserIndexById(receiverId);
   var useri = findUserById(receiverId);
    /*users[user1]*/
    useri.socket.emit('sdp',{
        description:description,
        senderId:senderId,
        offer : offer
    });
     
}

/// fonction de l'envoi du candidat ice
function ice(ice,senderId,receiverId){
    var useri = findUserById(receiverId);
    useri.socket.emit('ice',{
        ice:ice,
        senderId:senderId
    });
}

//// classess //////////////////////////////////////////////////////////
/// classe: conversation
function conversation(config){
    //properrties
    this.config = config;
    this.id = config.id;
    this.moderator = null;
    this.memebers = [];
    this.activeUser = null;

    //methods
    this.add = addMemeber;
    this.remove = removeMemeber;
    this.get = getMemeber;
    this.getIndex = getMemeberIndex;
    this.broadcast = broadcast;
    this.setModerator = setModerator;
    this.sendUsersList = sendUsersList;
}

// classe conversation : methods
function addMemeber(user1){
    //sendUsersList(user1);
    this.memebers[this.memebers.length] = user1;
}

function removeMemeber(userId){
    var i = this.getIndex(userId);
    if(i > -1){
        if(i < this.memebers.length-1) this.memebers[i] = this.memebers.pop();
        else this.memebers.pop();
    }else{
        console.log("user doesn't exist");
    }
}

function getMemeberIndex(userId) {
    var i=0;
    while((i<this.memebers.length)&&(this.memebers[i].socket.id!=userId))i++;
    if(i<this.memebers.length)return i;
    return -1;
}

function getMemeber(userId){
    var i = this.getIndex(userId);
    if(i > -1){
        return this.memebers[i];
    }else{
        console.log("user doesn't exist");
    }
}

function setModerator(user1){
    //console.log("setting moderator");
    if(this.config.moderator==user1.userName){
        this.moderator=user1;
        return true;
    }
    return false;
}

function broadcast(event,data,convId){
    for(i in this.memebers){
        this.memebers[i].socket.emit(event,data);
    }
}

function sendUsersList(user) {
    for(i in this.memebers){
        user.socket.emit("user",{
            userId : this.memebers[i].socket.id,
            userName : this.memebers[i].userName,  
            activeUser: this.activeUser
        });
    }
}
///////////////////////////////////////////////
///class: user
function user(userName,socket){
    //properties
    this.userName = userName;
    this.socket = socket;
}
////////////////////////////////////////////////////////////


////// helper functions //////////////////////////////////////////
function findUserIndexById(userId){
    var i  =  0;
    while ((i<users.length)&&(userId  !=  users[i].socket.id))i++;
    if (i<users.length) return i;
    return -1;
}

function findUserById(userId){
    var index = findUserIndexById(userId);
    if(index>-1){
        return users[index];
    }
    return null;
}

function findInCurrentConversations(convId){
    var i = 0;
    console.log("       seeking conversation ")
    while((i<conversations.length)&&(conversations[i].id!=convId)){i++;}
    if(i<conversations.length)return i;
    return -1;
}

function removeUser(userId){
    users[findUserIndexById(userId)]  =  users[users.length-1];
    users.pop();
}

function findSocket(socketId){
    var i = 0;
    while((i<socket.length)&&(sockets[i].id != socketId)){i++;}
    if(i<sockets.length)return socket[i];
    return -1;
}

function sendConversationList(user1){
    //console.log("sending concerned conversation list");
    for(var i in programmedConversations){
        if (isConcerned(user1,programmedConversations[i]))
        {
            user1.socket.emit('conversation',{conv:programmedConversations[i]});
            //console.log(" "+i+" : "+programmedConversations[i].title);
        }
    }
}

function isConcerned(user1,conv){
    var test1 = conv.moderator == user1.userName;
    var test2 = conv.members.indexOf(user1.userName)>-1;
    return test1 || test2;
}

function findUserIndexByUsername(userName){
    var i = 0;
    while((i<users.length)&&(users[i].userName!=userName))i++;
    if(i<users.length)return i;
    return -1;
}

function findProgrammedConversation(convId){
    var i=0;
    //console.log(convId);
    while((i<programmedConversations.length)&&(programmedConversations[i].id!=convId))i++;
    //console.log(i);
    if(i<programmedConversations.length) return i;
    return -1;
}

function showConnectedUsers(){
    for(var i in users){
        console.log("user ",users[i].userName,users[i].socket.id);
    }
}

