package com.fitness.Userservice.Service;

import com.fitness.Userservice.Controller.Dto.RegisterRequest;
import com.fitness.Userservice.Dto.UserResponse;
import com.fitness.Userservice.Model.User;
import com.fitness.Userservice.Repository.Userrepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    @Autowired
    private Userrepository userrepo;
    public UserResponse getUserProfile(String userId) {
        User user = userrepo.findById(userId)
                .orElseThrow((()-> new RuntimeException ("User is Not Found")));
        UserResponse userResponse= new UserResponse();
        userResponse.setId(user.getId());
        userResponse.setEmail(user.getEmail());
        userResponse.setPassword(user.getPassword());
        userResponse.setFirstName(user.getFirstName());
        userResponse.setLastName(user.getLastName());
        userResponse.setCreatedAt(user.getCreatedAt());
        userResponse.setUpdatedAt(user.getUpdatedAt());
        return userResponse;

    }
    public UserResponse addUserProfile(RegisterRequest request){
        if(userrepo.existsByEmail(request.getEmail())){
            throw new RuntimeException("this Email is Already Present");
        }

        User user= new User();
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setFirstName(request.getFirstName());



        User savedUser =userrepo.save(user);
        UserResponse userResponse = new UserResponse();
        userResponse.setId(savedUser.getId());
        userResponse.setEmail(savedUser.getEmail());
        userResponse.setPassword(savedUser.getPassword());
        userResponse.setFirstName(savedUser.getFirstName());
        userResponse.setLastName(savedUser.getLastName());
        userResponse.setCreatedAt(savedUser.getCreatedAt());
        userResponse.setUpdatedAt(savedUser.getUpdatedAt());

        return userResponse;
    }
}
