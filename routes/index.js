const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');

//multer
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './routes/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

var upload = multer({ storage: storage });

//--- Models of db
const PUser = require('../models/Patient');
const DUser = require('../models/Doctor');
const appoint = require('../models/Appointment');


//Homepage
router.get('/', (req, res) => (
  res.render("homepage")
))

// Register/Login Page
router.get('/welcome', forwardAuthenticated, (req, res) => res.render('welcome'));
router.get('/users/Patient', (req, res) => res.render('Patient'));
router.get('/users/Doctor', (req, res) => res.render('Doctor'));

//Dashboard 

//doc
router.get('/Ddashboard', ensureAuthenticated, (req, res) => {
  if (Object.getPrototypeOf(req.user) === PUser.prototype) {
    res.redirect("/");
  }
  else {
    res.render('Ddashboard', { user: req.user });
  }
});

//patient
router.get('/Pdashboard', ensureAuthenticated, (req, res) => {
  if (Object.getPrototypeOf(req.user) === DUser.prototype) {
    res.redirect("/");
  }
  else {
    res.render('Pdashboard', { user: req.user });
  }
});



//---------Edit profile---------


//---------doctor-----------

router.get('/Ddashboard/DeditProfile', ensureAuthenticated, (req, res) => {
  var yourDate = req.user.dateOfBirth;
  var daTe = yourDate.toISOString().split('T')[0]

  let shr = req.user.clinicTiming.start.getHours();
  let smin = req.user.clinicTiming.start.getMinutes();
  let ehr = req.user.clinicTiming.end.getHours();
  let emin = req.user.clinicTiming.end.getMinutes();

  let stime = "";
  let etime = "";

  if (shr < 10) {
    stime += "0" + shr;
  } else {
    stime += shr;
  }
  stime += ":";
  if (smin < 10) {
    stime += "0" + smin;
  } else {
    stime += smin;
  }

  if (ehr < 10) {
    etime += "0" + ehr;
  } else {
    etime += ehr;
  }
  etime += ":";
  if (emin < 10) {
    etime += "0" + emin;
  } else {
    etime += emin;
  }

  console.log(stime + " " + etime);
  res.render('DeditProfile', { user: req.user, date: daTe, start: stime, end: etime });
});

router.post('/Ddashboard/DeditProfile', upload.single('photo'), (req, res) => {
  const { name, address, dateOfBirth, medicalSchool, yearsOfPractice, language, clinicAddress, startTime, endTime, speciality, phone, sex, email, password, password2 } = req.body;
  let errors = [];

  if (!name || !password || !password2 || !address || !language || !dateOfBirth || !speciality || !clinicAddress || !medicalSchool || !yearsOfPractice || !phone || !sex) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.redirect("/Ddashboard/DeditProfile");
  } else {

    console.log(req.body);


    //clinic timings
    //start
    const shours = startTime.slice(0, 2);
    const sminutes = startTime.slice(3);
    const stime = new Date();
    stime.setHours(shours, sminutes);
    //end
    const ehours = endTime.slice(0, 2);
    const eminutes = endTime.slice(3);
    const etime = new Date();
    etime.setHours(ehours, eminutes);


    DUser.findOne({ _id: req.body.userId }, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (!foundUser) {
        } else {
          console.log(stime + " " + etime);
          foundUser.name = name;
          foundUser.address = address;
          foundUser.dateOfBirth = new Date(dateOfBirth);
          foundUser.medicalSchool = medicalSchool;
          foundUser.yearsOfPractice = yearsOfPractice;
          foundUser.language = language;
          foundUser.clinicAddress = clinicAddress;
          foundUser.clinicTiming = {
            start: stime,
            end: etime
          };
          foundUser.speciality = speciality;
          foundUser.phone = phone;
          foundUser.sex = sex;
          foundUser.password = password;



          //checking because we cant set value of any file because its against security measures
          if (req.body.Dcheckbox !== undefined) {
            if (req.file !== undefined) {
              foundUser.photo = {
                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                contentType: req.file.mimetype
              }
            } else {
              return res.redirect("/Ddashboard/DeditProfile")
            }
          }


          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
              if (err) throw err;
              console.log("old Pass=>" + foundUser.password);
              foundUser.password = hash;
              console.log("new Pass=>" + foundUser.password);
            });
          });



          foundUser.save(function (err) {
            if (err) {
              console.log(err);
            } else {
              req.flash(
                'success_msg',
                'You have updated your Profile'
              );
              res.redirect("/Ddashboard")
            }
          });
        }
      }
    });
  }
});


//----------------patient--------------------


router.get('/Pdashboard/PeditProfile', ensureAuthenticated, (req, res) => {
  var yourDate = new Date();
  var daTe = yourDate.toISOString().split('T')[0]
  res.render('PeditProfile', { user: req.user, date: daTe });
});


router.post('/Pdashboard/PeditProfile', upload.single('photo'), (req, res) => {
  const { name, address, dateOfBirth, password, sex, email, phone, password2, emergencyName, emergencyPhone, emergencyAddress } = req.body;
  let errors = [];


  if (!name || !password || !password2 || !address || !dateOfBirth || !sex || !phone || !emergencyName || !emergencyPhone || !emergencyAddress) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.redirect("/Pdashboard/PeditProfile");
  } else {

    PUser.findOne({ _id: req.body.userId }, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (!foundUser) {
        } else {

          foundUser.name = name;
          foundUser.address = address;
          foundUser.dateOfBirth = new Date(dateOfBirth);
          foundUser.phone = phone;
          foundUser.sex = sex;

          if (req.body.Pcheckbox !== undefined) {
            if (req.file !== undefined) {
              foundUser.photo = {
                data: fs.readFileSync(path.join(__dirname + '/uploads/' + req.file.filename)),
                contentType: req.file.mimetype
              }
            } else {
              return res.redirect("/Pdashboard/PeditProfile")
            }
          }

          foundUser.emergencyContacts = {
            name: emergencyName,
            phone: emergencyPhone,
            address: emergencyAddress
          }

          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
              if (err) throw err;
              console.log("old Pass=>" + foundUser.password);
              foundUser.password = hash;
              console.log("new Pass=>" + foundUser.password);
            });
          });


          foundUser.save(function (err) {
            if (err) {
              console.log(err);
            } else {
              req.flash(
                'success_msg',
                'You have updated your Profile'
              );
              res.redirect("/Pdashboard")
            }
          });
        }
      }
    });
  }
});

//Search for doctors post route

router.post('/Pdashboard', function (req, res) {
  if (req.isAuthenticated()) {
    console.log(req.body);
    let x = req.body.search;
    if (req.body.category === 'speciality') {
      DUser.find({ speciality: _.lowerCase(x) }, function (err, data) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(data);
          res.render('searchForDoctors', { data: data });
        }
      });
    }
    else {
      DUser.find({ name: _.lowerCase(x) }, function (err, data) {
        if (err) {
          console.log(err);
        }
        else {
          console.log(data);
          res.render('searchForDoctors', { data: data });
        }
      });
    }
  }
  else {
    res.redirect('/');
  }
})

// Appoitment page
router.get("/Pdashboard/makeAnAppoitment/:did", ensureAuthenticated, function(req, res){
    DUser.find({_id:req.params.did}, function(err, data){
      let date = new Date();
      let today = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate())  ;
      date = new Date(new Date().getTime() + 24*60*60*1000);
      let tom = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
       date = new Date(new Date().getTime() + 48*60*60*1000);
      let tom1 = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
       date = new Date(new Date().getTime() + 72*60*60*1000);
      let tom2 = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
       date = new Date(new Date().getTime() + 96*60*60*1000);
      let tom3 = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
      date = new Date(new Date().getTime() + 120*60*60*1000);
      let tom4 = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
      date = new Date(new Date().getTime() + 144*60*60*1000);
      let tom5 = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + (date.getDate()) ;
      res.render("MakeAppoitment", {doctor: data, patient:req.user , today:today, tom:tom, tom1:tom1, tom2:tom2, tom3:tom3, tom4:tom4, tom5:tom5});
    });
    //res.send(req.params.did);
});

router.post("/Pdashboard/makeAnAppoitment/:did", function(req, res){
    console.log(req.user._id);
    
    var t ;
      DUser.find({_id: req.body.doctorId}, function(err, data){
      if(err) console.log(err);
      else{
        t = data[0].clinicTiming;
        console.log(req.body.day);
        
        const appointment = new appoint({
          patientId: req.user._id,
          patientName: req.user.name,
          patientPhoto: req.user.photo,
          doctorId: req.params.did,
          doctorName: data[0].name,
          doctorSpeciality: data[0].speciality,
          clinicAddress: data[0].clinicAddress,
          doctorPhoto: data[0].photo,
          date:  new Date(req.body.day),
          time: t
        });
        //console.log(t);
        appointment.save().then(()=>{
          res.redirect("/Pdashboard/PmyAppointments");
        });
        
        }
    })
    
});

// Route for showing "My appointments" for patient
router.get("/Pdashboard/PmyAppointments", ensureAuthenticated,function(req, res){
  appoint.find({patientId: req.user._id}, function(err, data){
    if(err)
      console.log(err);
    else{
      res.render("PMy-Appointments", {data:data});
    }
  })
});

//Route for showing "My Appointments" for doctor
router.get("/Ddashboard/DmyAppointments", ensureAuthenticated, function(req, res){
  appoint.find({doctorId:req.user._id}, function(err, data){
    if(err)
      console.log(err);
    else{
      res.render("DMy-Appointments", {data: data});
    }
  })
});

module.exports = router;