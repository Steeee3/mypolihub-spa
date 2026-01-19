package it.polimi.mypolihub_spa.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.polimi.mypolihub_spa.DTO.ResultDTO;
import it.polimi.mypolihub_spa.repository.ResultRepository;

@Service
public class ResultService {
    
    @Autowired
    private ResultRepository resultRepository;

    @Transactional(readOnly = true)
    public List<ResultDTO> getAllResults() {
        return resultRepository.findAllByOrderByIdAsc().stream()
            .map(r -> new ResultDTO(r))
            .toList();
    }
}
