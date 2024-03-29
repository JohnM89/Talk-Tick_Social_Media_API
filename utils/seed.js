const mongoose = require('mongoose');
const connection = require('../config/connection');
const { User, Thought } = require('../models');
const { reaction, user, thought, getRandomArrItem,  } = require('./data');


// generate a random email based on username
const generateEmail = (username) => {
  const cleanedUsername = username.replace(/\s+/g, '').toLowerCase();
  return `${cleanedUsername}@example.com`;
};

// connect to the database
connection.on('error', (err) => err);

// once open then seed 
connection.once('open', async () => {
  console.log('connected');

  // clear existing data
  await User.deleteMany({});
  await Thought.deleteMany({});

  // create users
  const users = user.map(username => ({
    username,
    email: generateEmail(username)
  }));

  // inserts users into the database
  const createdUsers = await User.create(users);
  console.log('Users inserted');

  // create thoughts for each user
  const thoughtsData = [];

// create a random number of thoughts for each user
  createdUsers.forEach(user => {
    const numThoughts = Math.floor(Math.random() * 5) + 1; 
    for (let i = 0; i < numThoughts; i++) {
    thoughtsData.push({
      thoughtText: getRandomArrItem(thought),
      username: user._id,
      reactions: [{ 
        reactionBody: getRandomArrItem(reaction),
        username: user.username,
        reactionId: new mongoose.Types.ObjectId()
      }]
    });
  }
});

// create a random number of friends for each user
// assumes an ideal two way friendship model, A > B therefore B < A
  createdUsers.forEach(user => {
    const numFriends = Math.floor(Math.random() * (createdUsers.length - 1)) + 1;
    const friendIds = [];
    while(friendIds.length < numFriends){
      const potentialFriendId = createdUsers[Math.floor(Math.random() * createdUsers.length)]._id;
      // no self friending and no duplicate friending
      if (potentialFriendId.toString() !== user._id.toString() && !friendIds.includes(potentialFriendId)) {
        friendIds.push(potentialFriendId);
      }
    }
    User.findByIdAndUpdate(user._id, { $push: { friends: { $each: friendIds } } });
  });


  // puts thoughts data into the database
  const createdThoughts = await Thought.create(thoughtsData);
  console.log('Thoughts inserted');

 // promise.all to push thought id to user
  await Promise.all(createdUsers.map(async (user) => {
    const userThoughts = createdThoughts.filter(thought => thought.username.toString() === user._id.toString());
    const thoughtIds = userThoughts.map(thought => thought._id);
    await User.findByIdAndUpdate(user._id, { $push: { thoughts: { $each: thoughtIds } } });
  }));

  // promise.all to push friend id to user
  await Promise.all(createdUsers.map(async (user) => {
    const potentialFriends = createdUsers.filter(friend => friend._id.toString() !== user._id.toString());
    // randomly shuffles the array and selevts three friends
    const shuffledFriends = potentialFriends.sort(() => 0.5 - Math.random());
    const userFriends = shuffledFriends.slice(0, 3);
    const friendIds = userFriends.map(friend => friend._id);
    await User.findByIdAndUpdate(user._id, { $push: { friends: { $each: friendIds } } });
  }));

  console.info('Seeding complete! 🌱');
  process.exit(0);
});

