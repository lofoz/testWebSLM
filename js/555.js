// Your web app's Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyAHkpQ-ihDBoL5hBNQrQIm49s59_6Y7r4w",
    authDomain: "sounddb-2c346.firebaseapp.com",
    databaseURL: "https://sounddb-2c346.firebaseio.com",
    projectId: "sounddb-2c346",
    storageBucket: "sounddb-2c346.appspot.com",
    messagingSenderId: "145669725158",
    appId: "1:145669725158:web:e31507acfd7495e07bd427",
    measurementId: "G-76S8X5EJNG"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  firebase.analytics();
  
  
  // Get a reference to the storage service, which is used to create references in your storage bucket
  var storage = firebase.storage();
  
  // Create a storage reference from our storage service
  var storageRef = storage.ref();
  
  var soundDataRef = storageRef.child("SoundData/ios/" + Date.now() + ".json");
  var dBA = [100,5,9];
  var json = {"dBA":dBA};
  
  // convert your object into a JSON-string
  var jsonString = JSON.stringify(json);
  // create a Blob from the JSON-string
  var blob = new Blob([jsonString], {type: "application/json"});
  
  soundDataRef.put(blob).then(function(snapshot) {
    console.log('Uploaded a blob!');
  });