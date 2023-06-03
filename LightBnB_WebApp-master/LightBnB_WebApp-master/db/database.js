const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');
const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

// the following assumes that you named your connection variable `pool`
pool.query(`SELECT title FROM properties LIMIT 10;`).then(response => {return(response)})
/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  const promise = pool
  .query(
    `SELECT * FROM users
    WHERE email = $1`,
    [ email ])
  .then((res) => {
    if(!res.rows.length) {
      return(null)
    }
    return res.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
  return promise;
  };

//   let resolvedUser = null;
//   for (const userId in users) {
//     const user = users[userId];
//     if (user.email.toLowerCase() === email.toLowerCase()) {
//       resolvedUser = user;
//     }
//   }
//   return Promise.resolve(resolvedUser);
// };

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const promise = pool
  .query(
    `SELECT * FROM users
    WHERE id = $1`,
    [id])
  .then((res) => {
    if(!res.rows.length) {
      return (null)
    }
    return res.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
  return promise;
}
//   return Promise.resolve(users[id]);
// };

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const promise = pool
  .query(`INSERT INTO users (name, email, password) \
  VALUES ($1, $2, $3) \
  RETURNING *;`,
  [user.name, user.email, user.password])
  .then((res) => {
    if(!res.rows.length) {
      return (null)
    }
    return res.rows[0];
  })
  .catch((err) => {
    console.log(err.message);
  });
  return promise;
}


//   const userId = Object.keys(users).length + 1;
//   user.id = userId;
//   users[userId] = user;
//   return Promise.resolve(user);
// };

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = 
  `SELECT properties.*, reservations.*, AVG(property_reviews.rating) AS average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1 
  AND end_date < now()::date 
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;
  const queryParams = [guest_id, limit];
  return pool.query(queryString, queryParams).then((res) => res.rows);
};


// const getAllReservations = function (guest_id, limit = 10) {
//   const queryString = 
//   `SELECT properties.id AS id, properties.title, properties.cost_per_night, start_date, end_date, cover_photo_url, thumbnail_photo_url, AVG(rating) AS average_rating
//   FROM reservations
//   JOIN properties ON reservations.property_id = properties.id
//   JOIN property_reviews ON property_reviews.property_id = properties.id
//   WHERE reservations.guest_id = $1 
//   AND end_date < now()::date 
//   GROUP BY properties.id, reservations.id
//   ORDER BY reservations.start_date
//   LIMIT $2;`;
//   const queryParams = [guest_id, limit];
//   return pool.query(queryString, queryParams).then((res) => res.rows);
// };

  //   return getAllProperties(null, 2);
// };

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  const promise = pool
  const queryParams = [];
  const base = 10;
  let counter = 0;
  let queryString = `
  SELECT properties.*,
  AVG(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE 1=1 `;

  if (options.city) {
    counter++;
    queryParams.push(`%${options.city}%`);
    queryString += `AND city ILIKE $${queryParams.length}
    `;
  }

  if (options.owner_id) {
    counter++;
    queryParams.push(options.owner_id);
    if (counter === 2) {
      queryString += `AND owner_id = $${queryParams.length}
      `;
      console.log("HERE!");
    } else if (counter === 1) {
      queryString += `AND owner_id = $${queryParams.length}
      `;
    }
  }

  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    counter +=2;
    console.log("string ?", Number.isInteger(options.maximum_price_per_night));
    const min = parseInt(options.minimum_price_per_night, base);
    const max = parseInt(options.maximum_price_per_night, base);
    queryParams.push(min);
    queryString += `AND cost_per_night >= $${queryParams.length}
    `;
    queryParams.push(max);
    queryString += `AND cost_per_night <= $${queryParams.length}
    `;
  }
  queryString += `GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    counter ++;
    queryParams.push(options.minimum_rating);
    queryString += `HAVING AVG(property_reviews.rating) >= $${queryParams.length}
    `;
  }
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams).then((res) => res.rows);
  };
// const getAllProperties = (options, limit = 10) => {
//   return pool
//     .query(`SELECT properties.id, owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms, country, street, city, province, post_code, active, AVG(property_reviews.rating) AS average_rating
//     FROM properties 
//     LEFT JOIN property_reviews ON properties.id = property_id
//     GROUP BY properties.id
//     ORDER BY cost_per_night
//     LIMIT $1`, [limit])
//     .then((result) => {
//       console.log(result.rows);
//       return result.rows;
//     })
//     .catch((err) => {
//       console.log(err.message);
//     });
// };

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const promise = pool
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;`;

  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];
  return pool.query(queryString, values).then((res) => res.rows[0]);
};

  //   const propertyId = Object.keys(properties).length + 1;
//   property.id = propertyId;
//   properties[propertyId] = property;
//   return Promise.resolve(property);
// };

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
